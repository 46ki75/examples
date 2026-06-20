# strands.tools.mcp.MCPClient and the MCP transport generics ship partial type
# information, so this module opts down to basic type checking.
# pyright: basic
"""AgentCore Gateway access: a Cognito M2M token plus an MCP client over HTTP."""

from __future__ import annotations

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

import httpx
from mcp.client.streamable_http import streamable_http_client
from strands.tools.mcp import MCPClient

from .config import Config

logger = logging.getLogger(__name__)

_TOKEN_TIMEOUT_SECONDS = 30
# Streamable HTTP keeps an SSE channel open, so allow a long read timeout.
_MCP_TIMEOUT = httpx.Timeout(60.0, read=300.0)


def fetch_gateway_token(config: Config) -> str:
    """Mint a bearer token from Cognito using the client_credentials grant."""
    logger.debug(
        "requesting client_credentials token from %s", config.cognito_token_url
    )
    response = httpx.post(
        config.cognito_token_url,
        data={"grant_type": "client_credentials", "scope": config.cognito_scope},
        auth=(config.cognito_client_id, config.cognito_client_secret),
        timeout=_TOKEN_TIMEOUT_SECONDS,
    )
    response.raise_for_status()

    token = response.json().get("access_token")
    if not isinstance(token, str):
        raise RuntimeError("token endpoint did not return an access_token string")
    return token


def build_gateway_mcp_client(config: Config, token: str) -> MCPClient:
    """An MCP client bound to the Gateway, authenticated with the bearer token.

    The bearer token is attached via an `httpx.AsyncClient` whose lifecycle is
    tied to the transport context, so it is closed when the MCP session ends.
    """

    @asynccontextmanager
    async def transport() -> AsyncGenerator[Any]:
        async with httpx.AsyncClient(
            headers={"Authorization": f"Bearer {token}"},
            timeout=_MCP_TIMEOUT,
        ) as http_client:
            async with streamable_http_client(
                config.gateway_url, http_client=http_client
            ) as streams:
                yield streams

    return MCPClient(transport)
