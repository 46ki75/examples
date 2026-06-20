import asyncio
from typing import Any, Callable

import pytest

from agentcore_web_search import gateway
from agentcore_web_search.config import Config


def _config() -> Config:
    return Config(
        gateway_url="https://gw.example/mcp",
        gateway_oauth_provider_name="gateway-oauth-provider",
        cognito_scope="agentcore-gateway/invoke",
        worker_model_id="minimax/minimax-m2.5",
        synthesize_model_id="z-ai/glm-5.2",
        openrouter_api_key_param="/secret/openrouter-api-key",
        openrouter_api_key_region="ap-northeast-1",
        openrouter_base_url="https://openrouter.ai/api",
    )


def test_fetch_gateway_token_requests_m2m_token(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, Any] = {}

    # Stand in for AgentCore Identity's decorator: record how it was configured
    # and inject a known token, exactly as the real one injects access_token.
    def fake_requires_access_token(
        *, provider_name: str, scopes: list[str], auth_flow: str
    ) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
        captured.update(provider_name=provider_name, scopes=scopes, auth_flow=auth_flow)

        def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
            async def wrapper(*args: Any, **kwargs: Any) -> Any:
                kwargs["access_token"] = "tok-123"
                return await func(*args, **kwargs)

            return wrapper

        return decorator

    monkeypatch.setattr(gateway, "requires_access_token", fake_requires_access_token)

    token = asyncio.run(gateway.fetch_gateway_token(_config()))

    assert token == "tok-123"
    assert captured["provider_name"] == "gateway-oauth-provider"
    assert captured["scopes"] == ["agentcore-gateway/invoke"]
    assert captured["auth_flow"] == "M2M"
