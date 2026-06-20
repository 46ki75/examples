# boto3 ships partial type information for its dynamic clients, so this module
# opts down to basic type checking.
# pyright: basic
"""Authenticate the Claude Agent SDK against the configured model provider.

The Claude Agent SDK speaks the Anthropic Messages API through its bundled CLI.
Two auth modes are supported, selected by ``LLM_AUTH_MODE``:

- ``subscription`` (default): authenticate with a Claude Pro/Max subscription via
  a ``claude setup-token`` OAuth token (``CLAUDE_CODE_OAUTH_TOKEN``). This reaches
  Anthropic directly, so only Claude models are valid. Anthropic sizes the SDK's
  subscription credit for individual experimentation/automation and directs
  shared production at scale to a Claude Platform API key (i.e. ``openrouter``
  mode, or a direct Anthropic key).
- ``openrouter``: point the ``ANTHROPIC_*`` variables at OpenRouter's
  Anthropic-compatible endpoint and authenticate with an OpenRouter API key. Any
  OpenRouter-hosted model works.

Either credential is stored as an SSM SecureString and fetched at runtime, so no
model credential lives in the image or in plain environment variables.
"""

from __future__ import annotations

import os

import boto3

from .config import Config


def fetch_model_secret(config: Config) -> str:
    """Read the active mode's model credential from SSM (SecureString)."""
    ssm = boto3.client("ssm", region_name=config.model_secret_region)
    response = ssm.get_parameter(Name=config.model_secret_param, WithDecryption=True)
    return response["Parameter"]["Value"]


def configure_sdk_env(config: Config, secret: str) -> None:
    """Set the environment the SDK's bundled CLI reads when it starts.

    The SDK reads these once when it spawns its CLI subprocess, so they must be
    set before the first ``query()``.
    """
    if config.auth_mode == "subscription":
        # CLAUDE_CODE_OAUTH_TOKEN sits *below* ANTHROPIC_AUTH_TOKEN/ANTHROPIC_API_KEY
        # in the CLI's auth precedence, so any leftover ANTHROPIC_* would outrank
        # the subscription token and route around it. Clear them first.
        os.environ["CLAUDE_CODE_OAUTH_TOKEN"] = secret
        for name in ("ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_API_KEY"):
            os.environ.pop(name, None)
    else:
        # Route the SDK through OpenRouter's Anthropic-compatible API.
        # ANTHROPIC_API_KEY is cleared so the SDK authenticates with
        # ANTHROPIC_AUTH_TOKEN (the OpenRouter key) instead of an Anthropic key.
        os.environ["ANTHROPIC_BASE_URL"] = config.openrouter_base_url
        os.environ["ANTHROPIC_AUTH_TOKEN"] = secret
        os.environ["ANTHROPIC_API_KEY"] = ""
        os.environ.pop("CLAUDE_CODE_OAUTH_TOKEN", None)
