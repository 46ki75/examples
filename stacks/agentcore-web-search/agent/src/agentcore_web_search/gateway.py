# bedrock-agentcore ships partial type information, so the identity decorator is
# reported as untyped under strict mode.
# pyright: basic
"""AgentCore Gateway access: obtain a bearer token via AgentCore Identity.

The Claude Agent SDK opens and manages the MCP connection itself (given the
Gateway URL and an ``Authorization`` header), so this module only needs to obtain
the bearer token the SDK attaches to that connection.

Rather than hand-rolling the Cognito ``client_credentials`` POST, we delegate to
AgentCore Identity: it runs the machine-to-machine grant using the client_id and
secret stored in the OAuth2 credential provider's token vault. The client secret
therefore never reaches this container — the runtime only holds a short-lived
workload access token (injected by AgentCore Runtime) used to read the vault.
"""

from __future__ import annotations

import logging

from bedrock_agentcore.identity.auth import requires_access_token

from .config import Config

logger = logging.getLogger(__name__)


async def fetch_gateway_token(config: Config) -> str:
    """Obtain a Gateway bearer token via the AgentCore Identity OAuth2 provider.

    Uses the ``M2M`` (2-legged / client_credentials) flow. The decorator reads
    the workload access token from the runtime context, exchanges it for the
    provider's OAuth2 token (``GetResourceOauth2Token``), and injects it as
    ``access_token``.
    """
    logger.debug(
        "requesting M2M token from credential provider %s",
        config.gateway_oauth_provider_name,
    )

    # ``access_token`` is injected by the decorator; the default only exists so a
    # static checker doesn't flag the call below as missing the argument.
    @requires_access_token(
        provider_name=config.gateway_oauth_provider_name,
        scopes=[config.cognito_scope],
        auth_flow="M2M",
    )
    async def _with_token(*, access_token: str = "") -> str:
        return access_token

    return await _with_token()
