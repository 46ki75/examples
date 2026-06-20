# strands-agents ships partial type information for Agent/tool, so this module
# opts down to basic type checking.
# pyright: basic
"""The web-search specialist agent and the synthesize orchestrator.

Uses the Strands "agents as tools" pattern: the orchestrator (synthesize) agent
calls a `web_search` tool that is itself a specialist agent holding the Gateway's
WebSearch MCP tool.
"""

from __future__ import annotations

import logging
from typing import Any

from strands import Agent, tool
from strands.models import BedrockModel

logger = logging.getLogger(__name__)

WEB_SEARCH_SYSTEM_PROMPT = """You are a web research specialist.
Use the WebSearch tool to find current, authoritative information.
Issue focused queries of 200 characters or fewer; prefer primary sources.
Return concise findings and ALWAYS include the source URL and publication date
for every claim, because the final answer must cite them."""

SYNTHESIZE_SYSTEM_PROMPT = """You are a research orchestrator.
Break the user's question into specific sub-questions and call the `web_search`
tool for each one to gather current evidence. Then synthesize a single,
well-structured answer that:
- directly answers the question,
- cites sources inline as [title](url) with publication dates,
- flags conflicting or uncertain information.
Do not answer from memory alone; ground every claim in search results."""


def make_web_search_agent(model: BedrockModel, tools: list[Any]) -> Agent:
    """A specialist agent wired to the Gateway's WebSearch tool."""
    return Agent(model=model, tools=tools, system_prompt=WEB_SEARCH_SYSTEM_PROMPT)


def make_web_search_tool(search_agent: Agent):
    """Wrap the specialist agent as a tool the orchestrator can call."""

    @tool
    def web_search(query: str) -> str:
        """Search the web for current information on a focused question.

        Args:
            query: A specific, self-contained search question (<= 200 chars).

        Returns:
            Findings, each with its source URL and publication date.
        """
        logger.debug("web_search sub-agent query: %s", query)
        return str(search_agent(query))

    return web_search


def make_synthesize_agent(model: BedrockModel, search_agent: Agent) -> Agent:
    """The orchestrator that fans out searches and synthesizes a cited answer."""
    return Agent(
        model=model,
        tools=[make_web_search_tool(search_agent)],
        system_prompt=SYNTHESIZE_SYSTEM_PROMPT,
    )
