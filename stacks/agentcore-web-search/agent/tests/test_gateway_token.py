from typing import Any

import httpx
import pytest

from agentcore_web_search import gateway
from agentcore_web_search.config import Config


def _config() -> Config:
    return Config(
        gateway_url="https://gw.example/mcp",
        cognito_token_url="https://auth.example/oauth2/token",
        cognito_client_id="client",
        cognito_client_secret="secret",
        cognito_scope="agentcore-gateway/invoke",
        bedrock_model_id="us.amazon.nova-pro-v1:0",
    )


def test_fetch_gateway_token_returns_access_token(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, Any] = {}

    def fake_post(url: str, **kwargs: Any) -> httpx.Response:
        captured["url"] = url
        captured["kwargs"] = kwargs
        return httpx.Response(
            200, json={"access_token": "tok-123"}, request=httpx.Request("POST", url)
        )

    monkeypatch.setattr(httpx, "post", fake_post)

    token = gateway.fetch_gateway_token(_config())

    assert token == "tok-123"
    assert captured["url"] == "https://auth.example/oauth2/token"
    assert captured["kwargs"]["data"]["grant_type"] == "client_credentials"
    assert captured["kwargs"]["data"]["scope"] == "agentcore-gateway/invoke"
    assert captured["kwargs"]["auth"] == ("client", "secret")


def test_fetch_gateway_token_rejects_missing_token(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_post(url: str, **_kwargs: Any) -> httpx.Response:
        return httpx.Response(200, json={}, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx, "post", fake_post)

    with pytest.raises(RuntimeError):
        gateway.fetch_gateway_token(_config())
