# boto3 ships partial type information for its dynamic clients, so this module
# opts down to basic type checking.
# pyright: basic
"""OpenRouter model providers for the agents.

The OpenRouter API key is stored as an SSM SecureString parameter and fetched at
runtime, so no model API key lives in the image or in plain environment variables.
OpenRouter speaks the OpenAI-compatible API, so the agents use Strands' OpenAI
model provider pointed at the OpenRouter base URL.
"""

from __future__ import annotations

import boto3
from strands.models.openai import OpenAIModel

from .config import Config


def fetch_openrouter_api_key(config: Config) -> str:
    """Read the OpenRouter API key from SSM Parameter Store (SecureString)."""
    ssm = boto3.client("ssm", region_name=config.openrouter_api_key_region)
    response = ssm.get_parameter(
        Name=config.openrouter_api_key_param, WithDecryption=True
    )
    return response["Parameter"]["Value"]


def build_model(config: Config, api_key: str, model_id: str) -> OpenAIModel:
    """An OpenRouter-backed (OpenAI-compatible) Strands model for `model_id`."""
    return OpenAIModel(
        client_args={"api_key": api_key, "base_url": config.openrouter_base_url},
        model_id=model_id,
    )
