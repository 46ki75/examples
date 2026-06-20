import pytest

from agentcore_web_search.config import Config

_REQUIRED = {
    "GATEWAY_URL": "https://gw.example/mcp",
    "GATEWAY_OAUTH_PROVIDER_NAME": "gateway-oauth-provider",
    "COGNITO_SCOPE": "agentcore-gateway/invoke",
}

_OPTIONAL = (
    "LLM_AUTH_MODE",
    "WORKER_MODEL_ID",
    "SYNTHESIZE_MODEL_ID",
    "OPENROUTER_API_KEY_PARAM",
    "OPENROUTER_API_KEY_REGION",
    "OPENROUTER_BASE_URL",
    "CLAUDE_CODE_OAUTH_TOKEN_PARAM",
    "CLAUDE_CODE_OAUTH_TOKEN_REGION",
)


def _set_required(monkeypatch: pytest.MonkeyPatch) -> None:
    for key, value in _REQUIRED.items():
        monkeypatch.setenv(key, value)


def _clear_optional(monkeypatch: pytest.MonkeyPatch) -> None:
    for key in _OPTIONAL:
        monkeypatch.delenv(key, raising=False)


def test_default_mode_is_subscription(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_required(monkeypatch)
    _clear_optional(monkeypatch)

    config = Config.from_env()
    assert config.gateway_url == "https://gw.example/mcp"
    assert config.gateway_oauth_provider_name == "gateway-oauth-provider"
    assert config.cognito_scope == "agentcore-gateway/invoke"
    # Subscription is the default; it reaches Anthropic directly, so the model
    # defaults are Claude IDs and the credential is the OAuth-token parameter.
    assert config.auth_mode == "subscription"
    assert config.worker_model_id == "claude-haiku-4-5"
    assert config.synthesize_model_id == "claude-sonnet-4-6"
    assert config.model_secret_param == "/secret/claude-code-oauth-token"
    assert config.model_secret_region == "ap-northeast-1"


def test_subscription_token_param_override(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_required(monkeypatch)
    _clear_optional(monkeypatch)
    monkeypatch.setenv("CLAUDE_CODE_OAUTH_TOKEN_PARAM", "/secret/custom-token")

    config = Config.from_env()
    assert config.auth_mode == "subscription"
    assert config.model_secret_param == "/secret/custom-token"


def test_openrouter_mode(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_required(monkeypatch)
    _clear_optional(monkeypatch)
    monkeypatch.setenv("LLM_AUTH_MODE", "openrouter")

    config = Config.from_env()
    assert config.auth_mode == "openrouter"
    assert config.worker_model_id == "minimax/minimax-m2.5"
    assert config.synthesize_model_id == "z-ai/glm-5.2"
    assert config.model_secret_param == "/secret/openrouter-api-key"
    assert config.model_secret_region == "ap-northeast-1"
    assert config.openrouter_base_url == "https://openrouter.ai/api"


def test_openrouter_mode_reads_overrides(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_required(monkeypatch)
    _clear_optional(monkeypatch)
    monkeypatch.setenv("LLM_AUTH_MODE", "openrouter")
    monkeypatch.setenv("WORKER_MODEL_ID", "vendor/worker-model")
    monkeypatch.setenv("SYNTHESIZE_MODEL_ID", "vendor/synth-model")
    monkeypatch.setenv("OPENROUTER_API_KEY_PARAM", "/secret/custom-key")

    config = Config.from_env()
    assert config.worker_model_id == "vendor/worker-model"
    assert config.synthesize_model_id == "vendor/synth-model"
    assert config.model_secret_param == "/secret/custom-key"


def test_invalid_auth_mode_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_required(monkeypatch)
    monkeypatch.setenv("LLM_AUTH_MODE", "bogus")

    with pytest.raises(RuntimeError):
        Config.from_env()


def test_missing_required_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GATEWAY_URL", raising=False)

    with pytest.raises(RuntimeError):
        Config.from_env()
