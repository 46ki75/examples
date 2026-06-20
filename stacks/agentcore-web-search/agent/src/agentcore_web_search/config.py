"""Runtime configuration, loaded from environment variables set on the runtime."""

from __future__ import annotations

import os
from dataclasses import dataclass

AUTH_MODES = ("openrouter", "subscription")


@dataclass(frozen=True)
class Config:
    """Everything the agent needs to reach the Gateway and a model provider."""

    gateway_url: str
    # AgentCore Identity OAuth2 credential provider that mints the Gateway token.
    gateway_oauth_provider_name: str
    # OAuth scope requested for the client_credentials grant (Cognito resource
    # server scope, e.g. ``agentcore-gateway/invoke``).
    cognito_scope: str
    # How the Claude Agent SDK authenticates against its model provider:
    # ``openrouter`` (OpenRouter API key) or ``subscription`` (a Claude Pro/Max
    # ``claude setup-token`` OAuth token; Claude models only). See model_auth.py.
    auth_mode: str
    worker_model_id: str
    synthesize_model_id: str
    # SSM SecureString holding the model credential for the active auth mode —
    # the OpenRouter API key, or the Claude Code subscription OAuth token.
    model_secret_param: str
    model_secret_region: str
    # Only used in ``openrouter`` mode; becomes ``ANTHROPIC_BASE_URL``.
    openrouter_base_url: str

    @classmethod
    def from_env(cls) -> Config:
        auth_mode = os.environ.get("LLM_AUTH_MODE", "subscription")
        if auth_mode not in AUTH_MODES:
            raise RuntimeError(
                f"LLM_AUTH_MODE must be one of {AUTH_MODES}, got {auth_mode!r}"
            )

        if auth_mode == "subscription":
            # Subscription auth reaches Anthropic directly via the SDK's bundled
            # CLI, so only Claude model IDs are valid. The credential is the
            # ``claude setup-token`` OAuth token (CLAUDE_CODE_OAUTH_TOKEN).
            secret_param = os.environ.get(
                "CLAUDE_CODE_OAUTH_TOKEN_PARAM", "/secret/claude-code-oauth-token"
            )
            secret_region = os.environ.get(
                "CLAUDE_CODE_OAUTH_TOKEN_REGION", "ap-northeast-1"
            )
            default_worker = "claude-haiku-4-5"
            default_synthesize = "claude-sonnet-4-6"
        else:
            secret_param = os.environ.get(
                "OPENROUTER_API_KEY_PARAM", "/secret/openrouter-api-key"
            )
            # The SSM SecureString holding the key lives in this region, which may
            # differ from the stack's region (the stack is pinned to us-east-1 by
            # Web Search; the key happens to live in ap-northeast-1).
            secret_region = os.environ.get(
                "OPENROUTER_API_KEY_REGION", "ap-northeast-1"
            )
            default_worker = "minimax/minimax-m2.5"
            default_synthesize = "z-ai/glm-5.2"

        return cls(
            gateway_url=_require("GATEWAY_URL"),
            gateway_oauth_provider_name=_require("GATEWAY_OAUTH_PROVIDER_NAME"),
            cognito_scope=_require("COGNITO_SCOPE"),
            auth_mode=auth_mode,
            worker_model_id=os.environ.get("WORKER_MODEL_ID", default_worker),
            synthesize_model_id=os.environ.get(
                "SYNTHESIZE_MODEL_ID", default_synthesize
            ),
            model_secret_param=secret_param,
            model_secret_region=secret_region,
            # The Claude Agent SDK speaks the Anthropic Messages API, so in
            # ``openrouter`` mode this points at OpenRouter's Anthropic-compatible
            # endpoint (note: NOT the OpenAI-compatible `/api/v1`). It becomes
            # ANTHROPIC_BASE_URL. Unused in ``subscription`` mode.
            openrouter_base_url=os.environ.get(
                "OPENROUTER_BASE_URL", "https://openrouter.ai/api"
            ),
        )


def _require(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"required environment variable {name!r} is not set")
    return value
