from typing import Any, cast

from agentcore_web_search.agents import (
    GATEWAY_TOOLS,
    MCP_SERVER_NAME,
    build_agent_options,
)
from agentcore_web_search.config import Config


def _config() -> Config:
    return Config(
        gateway_url="https://gw.example/mcp",
        gateway_oauth_provider_name="gateway-oauth-provider",
        cognito_scope="agentcore-gateway/invoke",
        auth_mode="openrouter",
        worker_model_id="vendor/worker",
        synthesize_model_id="vendor/synth",
        model_secret_param="/secret/openrouter-api-key",
        model_secret_region="ap-northeast-1",
        openrouter_base_url="https://openrouter.ai/api",
    )


def test_orchestrator_uses_synthesize_model() -> None:
    options = build_agent_options(_config(), token="tok-abc")
    assert options.model == "vendor/synth"


def test_web_search_subagent_uses_worker_model_and_gateway_tool() -> None:
    options = build_agent_options(_config(), token="tok-abc")

    assert options.agents is not None
    subagent = options.agents["web-search"]
    assert subagent.model == "vendor/worker"
    assert subagent.tools == [GATEWAY_TOOLS]


def test_builtins_are_hidden_and_gateway_is_allowed() -> None:
    options = build_agent_options(_config(), token="tok-abc")

    # The bundled WebSearch/Bash must never be reachable; only the Agent tool
    # (for delegation) and the Gateway MCP tools are allowed.
    assert "WebSearch" in (options.disallowed_tools or [])
    assert "Bash" in (options.disallowed_tools or [])
    assert "Agent" in (options.allowed_tools or [])
    assert GATEWAY_TOOLS in (options.allowed_tools or [])


def test_gateway_mcp_server_carries_bearer_token() -> None:
    options = build_agent_options(_config(), token="tok-abc")

    # mcp_servers may be a dict or a path to a config file; we build a dict.
    servers = options.mcp_servers
    assert isinstance(servers, dict)
    # Each value is a TypedDict union at type-check time but a plain dict at
    # runtime; narrow it so we can assert on the wiring.
    server = cast("dict[str, Any]", servers[MCP_SERVER_NAME])
    assert server["type"] == "http"
    assert server["url"] == "https://gw.example/mcp"
    assert server["headers"]["Authorization"] == "Bearer tok-abc"
