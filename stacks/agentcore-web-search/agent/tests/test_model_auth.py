import os

import pytest

from agentcore_web_search import model_auth
from agentcore_web_search.config import Config

# Env vars configure_sdk_env reads or mutates. Registering each with monkeypatch
# (even just to delete it) records its pre-test state, so monkeypatch restores it
# on teardown despite the direct os.environ writes in the code under test.
_TOUCHED = (
    "CLAUDE_CODE_OAUTH_TOKEN",
    "ANTHROPIC_BASE_URL",
    "ANTHROPIC_AUTH_TOKEN",
    "ANTHROPIC_API_KEY",
)


def _config(auth_mode: str) -> Config:
    return Config(
        gateway_url="https://gw.example/mcp",
        gateway_oauth_provider_name="gateway-oauth-provider",
        cognito_scope="agentcore-gateway/invoke",
        auth_mode=auth_mode,
        worker_model_id="w",
        synthesize_model_id="s",
        model_secret_param="/secret/x",
        model_secret_region="ap-northeast-1",
        openrouter_base_url="https://openrouter.ai/api",
    )


def test_openrouter_mode_routes_anthropic_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in _TOUCHED:
        monkeypatch.delenv(name, raising=False)

    model_auth.configure_sdk_env(_config("openrouter"), "or-key")

    assert os.environ["ANTHROPIC_BASE_URL"] == "https://openrouter.ai/api"
    assert os.environ["ANTHROPIC_AUTH_TOKEN"] == "or-key"
    assert os.environ["ANTHROPIC_API_KEY"] == ""
    assert "CLAUDE_CODE_OAUTH_TOKEN" not in os.environ


def test_subscription_mode_sets_token_and_clears_anthropic(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    for name in _TOUCHED:
        monkeypatch.delenv(name, raising=False)
    # Leftover OpenRouter routing must be cleared, or these would outrank the
    # subscription token in the CLI's auth precedence.
    monkeypatch.setenv("ANTHROPIC_BASE_URL", "https://openrouter.ai/api")
    monkeypatch.setenv("ANTHROPIC_AUTH_TOKEN", "or-key")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")

    model_auth.configure_sdk_env(_config("subscription"), "oauth-tok")

    assert os.environ["CLAUDE_CODE_OAUTH_TOKEN"] == "oauth-tok"
    assert "ANTHROPIC_BASE_URL" not in os.environ
    assert "ANTHROPIC_AUTH_TOKEN" not in os.environ
    assert "ANTHROPIC_API_KEY" not in os.environ
