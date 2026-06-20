# agentcore-web-search (agent)

The Python (Claude Agent SDK) half of the [agentcore-web-search](../README.md)
stack. A member of the repo-root [uv](https://docs.astral.sh/uv/) workspace,
packaged for the AgentCore Runtime as a `linux/arm64` container.

## Modules

| Module          | Responsibility                                                                 |
| --------------- | ------------------------------------------------------------------------------ |
| `config.py`     | Read runtime configuration from environment variables.                         |
| `gateway.py`    | Get a Gateway bearer token from the AgentCore Identity OAuth2 provider (M2M).  |
| `openrouter.py` | Fetch the OpenRouter key from SSM and point the SDK at its endpoint.           |
| `agents.py`     | Build the `ClaudeAgentOptions`: synthesize orchestrator + web-search subagent. |
| `main.py`       | `BedrockAgentCoreApp` entrypoint; runs `query()` and streams the answer.       |

## Environment variables (set by Terraform on the runtime)

| Variable                      | Meaning                                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| `GATEWAY_URL`                 | MCP endpoint of the AgentCore Gateway.                                                             |
| `GATEWAY_OAUTH_PROVIDER_NAME` | AgentCore Identity OAuth2 credential provider that vends the Gateway token.                        |
| `COGNITO_SCOPE`               | OAuth scope requested for the M2M grant, e.g. `agentcore-gateway/invoke`.                          |
| `OPENROUTER_API_KEY_PARAM`    | SSM SecureString name holding the OpenRouter API key.                                              |
| `WORKER_MODEL_ID`             | OpenRouter model for the web-search worker sub-agents.                                             |
| `SYNTHESIZE_MODEL_ID`         | OpenRouter model for the synthesize orchestrator.                                                  |
| `OPENROUTER_BASE_URL`         | OpenRouter base URL; becomes the SDK's `ANTHROPIC_BASE_URL` (default `https://openrouter.ai/api`). |
| `OPENROUTER_API_KEY_REGION`   | Region the SSM SecureString lives in (default ap-northeast-1).                                     |

## Develop

Dev tooling and the lockfile live at the workspace root. From the repo root:

```bash
uv sync                      # syncs the whole workspace, this agent included
just -f python/justfile ci   # ruff, pyright (strict), pytest over python/ + stacks/
```

Tests are split into hermetic (default) and `live` tiers:

```bash
uv run pytest             # hermetic only
AGENT_RUNTIME_ARN=... uv run pytest -m live   # invokes the deployed runtime
```

## Build the image manually

The image installs a pinned `requirements.txt` exported from the workspace lock:

```bash
uv export --package agentcore-web-search --no-dev --no-emit-workspace \
  --frozen --no-hashes -o requirements.txt
docker buildx build --platform linux/arm64 -t <ecr-url>:latest --push .
```

(Normally done via the stack's `just push`.)
