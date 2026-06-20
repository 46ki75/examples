import pytest

from agentcore_web_search.config import Config

_REQUIRED = {
    "GATEWAY_URL": "https://gw.example/mcp",
    "COGNITO_TOKEN_URL": "https://auth.example/oauth2/token",
    "COGNITO_CLIENT_ID": "client",
    "COGNITO_CLIENT_SECRET": "secret",
    "COGNITO_SCOPE": "agentcore-gateway/invoke",
}


def test_from_env_reads_all_fields(monkeypatch: pytest.MonkeyPatch) -> None:
    for key, value in _REQUIRED.items():
        monkeypatch.setenv(key, value)
    monkeypatch.setenv("WORKER_MODEL_ID", "vendor/worker-model")
    monkeypatch.setenv("SYNTHESIZE_MODEL_ID", "vendor/synth-model")
    monkeypatch.setenv("OPENROUTER_API_KEY_PARAM", "/secret/custom-key")

    config = Config.from_env()

    assert config.gateway_url == "https://gw.example/mcp"
    assert config.cognito_scope == "agentcore-gateway/invoke"
    assert config.worker_model_id == "vendor/worker-model"
    assert config.synthesize_model_id == "vendor/synth-model"
    assert config.openrouter_api_key_param == "/secret/custom-key"


def test_defaults_when_optional_unset(monkeypatch: pytest.MonkeyPatch) -> None:
    for key, value in _REQUIRED.items():
        monkeypatch.setenv(key, value)
    for key in (
        "WORKER_MODEL_ID",
        "SYNTHESIZE_MODEL_ID",
        "OPENROUTER_API_KEY_PARAM",
        "OPENROUTER_API_KEY_REGION",
        "OPENROUTER_BASE_URL",
    ):
        monkeypatch.delenv(key, raising=False)

    config = Config.from_env()
    assert config.worker_model_id == "minimax/minimax-m2.5"
    assert config.synthesize_model_id == "z-ai/glm-5.2"
    assert config.openrouter_api_key_param == "/secret/openrouter-api-key"
    assert config.openrouter_api_key_region == "ap-northeast-1"
    assert config.openrouter_base_url == "https://openrouter.ai/api/v1"


def test_missing_required_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GATEWAY_URL", raising=False)

    with pytest.raises(RuntimeError):
        Config.from_env()
