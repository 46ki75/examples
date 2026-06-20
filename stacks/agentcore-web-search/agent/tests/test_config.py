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
    monkeypatch.setenv("BEDROCK_MODEL_ID", "us.anthropic.claude-sonnet-4")

    config = Config.from_env()

    assert config.gateway_url == "https://gw.example/mcp"
    assert config.cognito_scope == "agentcore-gateway/invoke"
    assert config.bedrock_model_id == "us.anthropic.claude-sonnet-4"


def test_bedrock_model_id_has_default(monkeypatch: pytest.MonkeyPatch) -> None:
    for key, value in _REQUIRED.items():
        monkeypatch.setenv(key, value)
    monkeypatch.delenv("BEDROCK_MODEL_ID", raising=False)

    assert Config.from_env().bedrock_model_id == "us.amazon.nova-pro-v1:0"


def test_missing_required_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GATEWAY_URL", raising=False)

    with pytest.raises(RuntimeError):
        Config.from_env()
