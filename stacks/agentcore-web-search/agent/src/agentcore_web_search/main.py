# bedrock-agentcore ships partial type information, so the entrypoint decorator
# and the payload are reported as unknown under strict mode.
# pyright: basic
"""AgentCore Runtime entrypoint: orchestrate web search and synthesize an answer."""

from __future__ import annotations

import logging

from bedrock_agentcore.runtime import BedrockAgentCoreApp
from claude_agent_sdk import AssistantMessage, TextBlock, query

from .agents import build_agent_options
from .config import Config
from .gateway import fetch_gateway_token
from .openrouter import configure_sdk_env, fetch_openrouter_api_key

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
    configure_sdk_env(config, api_key)
    token = fetch_gateway_token(config)
    options = build_agent_options(config, token)

    # The orchestrator's own text (its preamble and final synthesis) arrives as
    # AssistantMessage text blocks; the subagent's searching is encapsulated in
    # the Agent tool results, so streaming these blocks yields only the answer.
    async for message in query(prompt=prompt, options=options):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock) and block.text:
                    yield block.text


if __name__ == "__main__":
    app.run()
