# bedrock-agentcore and strands ship partial type information, so the entrypoint
# decorator and the payload are reported as unknown under strict mode.
# pyright: basic
"""AgentCore Runtime entrypoint: orchestrate web search and synthesize an answer."""

from __future__ import annotations

import logging

from bedrock_agentcore.runtime import BedrockAgentCoreApp

from .agents import make_synthesize_agent
from .config import Config
from .gateway import build_gateway_mcp_client, fetch_gateway_token
from .models import build_model, fetch_openrouter_api_key

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = BedrockAgentCoreApp()


@app.entrypoint
async def invoke(payload):
    """Handle one invocation and stream the synthesized, cited answer."""
    prompt = payload.get("prompt")
    if not prompt:
        yield "Error: request payload must include a 'prompt' field."
        return

    config = Config.from_env()
    api_key = fetch_openrouter_api_key(config)
    synthesize_model = build_model(config, api_key, config.synthesize_model_id)
    worker_model = build_model(config, api_key, config.worker_model_id)
    token = fetch_gateway_token(config)
    gateway = build_gateway_mcp_client(config, token)

    # Keep the MCP session open for the whole run so the orchestrator can reach
    # the WebSearch tool through the specialist sub-agent.
    with gateway:
        tools = gateway.list_tools_sync()
        logger.info("gateway exposes %d tool(s)", len(tools))

        orchestrator = make_synthesize_agent(synthesize_model, worker_model, tools)

        async for event in orchestrator.stream_async(prompt):
            if "data" in event:
                yield event["data"]


if __name__ == "__main__":
    app.run()
