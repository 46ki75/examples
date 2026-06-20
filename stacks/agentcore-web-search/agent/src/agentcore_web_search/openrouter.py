# boto3 ships partial type information for its dynamic clients, so this module
# opts down to basic type checking.
# pyright: basic
"""Point the Claude Agent SDK at OpenRouter.

The Claude Agent SDK speaks the Anthropic Messages API, and OpenRouter exposes an
Anthropic-compatible endpoint, so the SDK talks to OpenRouter directly once the
``ANTHROPIC_*`` environment variables point at it. The OpenRouter API key is
stored as an SSM SecureString and fetched at runtime, so no model key lives in
the image or in plain environment variables.
"""

from __future__ import annotations

import os

import boto3

from .config import Config


def fetch_openrouter_api_key(config: Config) -> str:
    """Read the OpenRouter API key from SSM Parameter Store (SecureString)."""
    ssm = boto3.client("ssm", region_name=config.openrouter_api_key_region)
    response = ssm.get_parameter(
        Name=config.openrouter_api_key_param, WithDecryption=True
    )
    return response["Parameter"]["Value"]


def configure_sdk_env(config: Config, api_key: str) -> None:
    """Route the Claude Agent SDK through OpenRouter's Anthropic-compatible API.

    The SDK reads these once when it starts its bundled CLI subprocess, so they
    must be set before the first ``query()``. ``ANTHROPIC_API_KEY`` is cleared so
    the SDK authenticates with ``ANTHROPIC_AUTH_TOKEN`` (the OpenRouter key)
    instead of looking for an Anthropic key.
    """
    os.environ["ANTHROPIC_BASE_URL"] = config.openrouter_base_url
    os.environ["ANTHROPIC_AUTH_TOKEN"] = api_key
    os.environ["ANTHROPIC_API_KEY"] = ""
