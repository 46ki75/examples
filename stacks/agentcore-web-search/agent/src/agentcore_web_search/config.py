"""Runtime configuration, loaded from environment variables set on the runtime."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    """Everything the agent needs to reach the Gateway and OpenRouter."""

    gateway_url: str
    cognito_token_url: str
    cognito_client_id: str
    cognito_client_secret: str
    cognito_scope: str
    worker_model_id: str
    synthesize_model_id: str
    openrouter_api_key_param: str
    openrouter_api_key_region: str
    openrouter_base_url: str

    @classmethod
    def from_env(cls) -> Config:
        return cls(
            gateway_url=_require("GATEWAY_URL"),
            cognito_token_url=_require("COGNITO_TOKEN_URL"),
            cognito_client_id=_require("COGNITO_CLIENT_ID"),
            cognito_client_secret=_require("COGNITO_CLIENT_SECRET"),
            cognito_scope=_require("COGNITO_SCOPE"),
            worker_model_id=os.environ.get("WORKER_MODEL_ID", "minimax/minimax-m2.5"),
            synthesize_model_id=os.environ.get("SYNTHESIZE_MODEL_ID", "z-ai/glm-5.2"),
            openrouter_api_key_param=os.environ.get(
                "OPENROUTER_API_KEY_PARAM", "/secret/openrouter-api-key"
            ),
            # The SSM SecureString holding the key lives in this region, which may
            # differ from the stack's region (the stack is pinned to us-east-1 by
            # Web Search; the key happens to live in ap-northeast-1).
            openrouter_api_key_region=os.environ.get(
                "OPENROUTER_API_KEY_REGION", "ap-northeast-1"
            ),
            openrouter_base_url=os.environ.get(
                "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
            ),
        )


def _require(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"required environment variable {name!r} is not set")
    return value
