# AgentCore Web Search

A runnable example of [Web Search on Amazon Bedrock AgentCore][blog] — a fully
managed, MCP-compliant web search tool exposed as a built-in connector on an
AgentCore **Gateway**. Two [Strands Agents][strands] cooperate inside an
AgentCore **Runtime**:

- **Web Search Agent** — a specialist that calls the Gateway's `WebSearch` tool.
- **Synthesize Agent** — an orchestrator that decomposes the question, fans out
  searches through the web-search agent (the "agents as tools" pattern), and
  synthesizes a single cited answer.

```txt
  caller ──InvokeAgentRuntime──▶ AgentCore Runtime (ECR image, arm64)
                                   └─ Synthesize Agent (orchestrator, OpenRouter)
                                        └─ tool: web_search  (agents as tools)
                                             └─ Web Search Agent (OpenRouter)
                                                  └─ MCP WebSearch tool
                                                       │ Bearer JWT (Cognito M2M)
                                                       ▼
                                            AgentCore Gateway (CUSTOM_JWT)
                                                  └─ target: connector "web-search"
                                                       │ GATEWAY_IAM_ROLE (SigV4)
                                                       ▼
                                            AWS-managed Web Search
```

## Layout

| Path         | What                                                                           |
| ------------ | ------------------------------------------------------------------------------ |
| `terraform/` | ECR, Cognito (JWT authorizer), Gateway + web-search target, Runtime, IAM       |
| `agent/`     | Python (Strands) agent + `Dockerfile` — a member of the repo-root uv workspace |

## Prerequisites

- `terraform`, `docker` (with `buildx`), the `aws` CLI, `just`, and `uv`.
- AWS credentials for **us-east-1** (the only region where Web Search is offered).
- An **OpenRouter API key** stored as an SSM Parameter Store **SecureString** at
  `/secret/openrouter-api-key` (override with `var.openrouter_api_key_param`). It
  is read from `var.openrouter_api_key_region` (default `ap-northeast-1`) — Web
  Search pins the stack to us-east-1, so the key is read cross-region from
  wherever it lives. The runtime reads and decrypts it at startup; no model key
  lives in the image or in plain env vars. The agents reason with OpenRouter
  models — defaults
  `minimax/minimax-m2.5` (worker) and `z-ai/glm-5.2` (synthesize). Use reliable
  tool-callers — weak models answer from memory instead of invoking `web_search`,
  so the agent never actually searches.
- Docker able to build `linux/arm64` (native on Apple Silicon / Graviton; on
  x86 hosts enable QEMU: `docker run --privileged --rm tonistiigi/binfmt --install arm64`).

## Deploy

The Runtime needs its container image to already exist in ECR, so deploy in order
(all wrapped in the `justfile`):

```bash
just deploy        # init → create ECR → build/push image → apply the rest
just invoke prompt="What changed in the AWS CLI this week?"
```

Or step by step:

```bash
just init
just bootstrap-ecr     # terraform apply -target=aws_ecr_repository.agent
just push              # buildx build --platform linux/arm64 + push :latest
just apply             # gateway, web-search target, runtime, endpoint
```

### Redeploying after a code change

```bash
just push v2
terraform -chdir=terraform apply -var image_tag=v2   # new tag ⇒ new runtime version
```

(Pushing the same `:latest` tag will not change Terraform state, so the runtime
keeps serving the old version — use a fresh tag.)

## Tear down

```bash
just destroy
```

## How the pieces fit

- **Gateway target** — the built-in `web-search` connector is created by a small
  boto3 helper (`web_search_target.py`) invoked from a `terraform_data` resource
  (`gateway_target.tf`). Neither the native `aws_bedrockagentcore_gateway_target`
  resource nor the bundled `aws` CLI model the `connector` target type yet, so the
  helper runs via `uv run` to use the workspace's newer pinned boto3. Everything
  else is native Terraform.
- **Endpoint versioning** — each code or config change creates a new runtime
  version. The `live` endpoint pins `agent_runtime_version` to the runtime's
  current version (`runtime.tf`) so it always serves the latest; otherwise it
  keeps serving the version it was first created with.
- **Sub-agent concurrency** — the orchestrator runs its fanned-out `web_search`
  calls through a `SequentialToolExecutor`. The orchestrator and its sub-agents
  share one Bedrock streaming client and one MCP session, which cannot be driven
  by parallel tool calls in a single turn.
- **Inbound auth** — the Gateway uses a `CUSTOM_JWT` authorizer backed by a
  Cognito machine-to-machine (client_credentials) app client. The agent mints a
  bearer token at startup and passes it on the MCP connection.
- **Outbound auth** — the Gateway reaches the AWS-managed search backend with its
  service role (`GATEWAY_IAM_ROLE`), which holds `bedrock-agentcore:InvokeGateway`
  and `bedrock-agentcore:InvokeWebSearch`.
- **Model** — the Strands agents reason with OpenRouter (OpenAI-compatible API):
  the orchestrator uses `var.synthesize_model_id`, the web-search sub-agents use
  `var.worker_model_id`. The runtime reads the OpenRouter API key from an SSM
  SecureString at startup (execution role: `ssm:GetParameter` + `kms:Decrypt`
  scoped to `kms:ViaService = ssm.*`), so no model key lives in the image or in
  plain env vars. Reaching `openrouter.ai` needs outbound internet, which the
  runtime's `PUBLIC` network mode provides.

## Cost & notes

- Web Search is billed at **$7 per 1,000 queries** (us-east-1), plus OpenRouter
  model tokens and Runtime usage.
- The Cognito client secret is passed to the runtime as a plain environment
  variable for example simplicity. In production, store it in Secrets Manager and
  grant the runtime role read access instead.
- Per the Web Search acceptable-use terms, keep and display the source citations
  the tool returns — the agents are prompted to do so.

[blog]: https://aws.amazon.com/blogs/aws/announcing-web-search-on-amazon-bedrock-agentcore-ground-your-ai-agents-in-current-accurate-web-knowledge/
[strands]: https://strandsagents.com/
