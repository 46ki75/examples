# claude_agent_sdk ships TypedDict configs that pyright strict flags on plain
# dict literals, so this module opts down to basic type checking.
# pyright: basic
"""Build the Claude Agent SDK options for the web-search stack.

The synthesize orchestrator (``synthesize_model_id``) decomposes the question and
delegates each sub-question to a ``web-search`` subagent (``worker_model_id``) via
the SDK's built-in ``Agent`` tool — the "agents as tools" pattern. The subagent
owns the Gateway's MCP ``WebSearch`` tool; every Claude Code built-in is hidden so
the models can only reach the managed Gateway search.
"""

from __future__ import annotations

from claude_agent_sdk import AgentDefinition, ClaudeAgentOptions

from .config import Config

# Name we register the Gateway MCP server under; the SDK namespaces its tools as
# ``mcp__<server>__<tool>``.
MCP_SERVER_NAME = "gateway"

# The Gateway advertises its connector tool as ``web-search-tool___WebSearch``
# (target name + ``___`` + tool name). Allow every tool on the Gateway server
# with the server-scoped pattern so we don't depend on that exact, brittle name.
GATEWAY_TOOLS = f"mcp__{MCP_SERVER_NAME}"

# The Claude Agent SDK exposes Claude Code's built-in tools by default. Hide them
# all so the agents can only call the managed Gateway WebSearch tool — never the
# bundled WebSearch/WebFetch, a shell, or the filesystem.
HIDDEN_BUILTINS = [
    "WebSearch",
    "WebFetch",
    "Bash",
    "BashOutput",
    "KillShell",
    "Read",
    "Write",
    "Edit",
    "MultiEdit",
    "NotebookEdit",
    "Glob",
    "Grep",
    "TodoWrite",
    "ExitPlanMode",
]

WEB_SEARCH_SYSTEM_PROMPT = """You are a web research specialist.
Use the WebSearch tool to find current, authoritative information.
Issue focused queries of 200 characters or fewer; prefer primary sources.
Make at most two or three searches — do not repeat near-identical queries.
Return concise findings and ALWAYS include the source URL and publication date
for every claim, because the final answer must cite them."""

SYNTHESIZE_SYSTEM_PROMPT = """You are a research orchestrator.
Break the user's question into specific sub-questions and delegate each one to
the `web-search` subagent to gather current evidence. Then synthesize a single,
well-structured answer that:
- directly answers the question,
- cites sources inline as [title](url) with publication dates,
- flags conflicting or uncertain information.
Do not answer from memory alone; ground every claim in search results."""


def build_agent_options(config: Config, token: str) -> ClaudeAgentOptions:
    """Assemble the orchestrator + web-search subagent as SDK options.

    The orchestrator reasons with ``synthesize_model_id`` and the ``web-search``
    subagent with ``worker_model_id``. ``token`` is the Cognito bearer the SDK
    attaches to the Gateway MCP connection.
    """
    return ClaudeAgentOptions(
        model=config.synthesize_model_id,
        system_prompt=SYNTHESIZE_SYSTEM_PROMPT,
        mcp_servers={
            MCP_SERVER_NAME: {
                "type": "http",
                "url": config.gateway_url,
                "headers": {"Authorization": f"Bearer {token}"},
            }
        },
        # The orchestrator may use the Agent tool (to delegate) and the Gateway
        # search tools; everything else is hidden.
        allowed_tools=["Agent", GATEWAY_TOOLS],
        disallowed_tools=HIDDEN_BUILTINS,
        agents={
            "web-search": AgentDefinition(
                description=(
                    "Searches the web for ONE focused question and returns "
                    "findings with source URLs and publication dates."
                ),
                prompt=WEB_SEARCH_SYSTEM_PROMPT,
                tools=[GATEWAY_TOOLS],
                model=config.worker_model_id,
            )
        },
        # No on-disk CLAUDE.md / settings exist in the container, but pin to none
        # so the agent stays hermetic regardless of the filesystem.
        setting_sources=[],
        # Enough turns for several delegated searches plus the final synthesis.
        max_turns=20,
    )
