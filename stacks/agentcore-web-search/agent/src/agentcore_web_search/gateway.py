"""AgentCore Gateway access: mint a Cognito M2M bearer token.

The Claude Agent SDK opens and manages the MCP connection itself (given the
Gateway URL and an ``Authorization`` header), so this module only needs to mint
the bearer token the SDK attaches to that connection.
"""

from __future__ import annotations

import logging

import httpx

from .config import Config

logger = logging.getLogger(__name__)

_TOKEN_TIMEOUT_SECONDS = 30


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
