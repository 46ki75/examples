"""Runtime configuration, loaded from environment variables set on the runtime."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    """Everything the agent needs to reach the Gateway and Bedrock."""

    gateway_url: str
    cognito_token_url: str
    cognito_client_id: str
    cognito_client_secret: str
    cognito_scope: str
    bedrock_model_id: str

    @classmethod
    def from_env(cls) -> Config:
        return cls(
            gateway_url=_require("GATEWAY_URL"),
            cognito_token_url=_require("COGNITO_TOKEN_URL"),
            cognito_client_id=_require("COGNITO_CLIENT_ID"),
            cognito_client_secret=_require("COGNITO_CLIENT_SECRET"),
            cognito_scope=_require("COGNITO_SCOPE"),
            bedrock_model_id=os.environ.get(
                "BEDROCK_MODEL_ID", "us.amazon.nova-pro-v1:0"
            ),
        )


def _require(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"required environment variable {name!r} is not set")
    return value
