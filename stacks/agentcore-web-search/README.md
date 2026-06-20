# AgentCore Web Search

A runnable example of [Web Search on Amazon Bedrock AgentCore][blog] — a fully
managed, MCP-compliant web search tool exposed as a built-in connector on an
AgentCore **Gateway**. Two [Claude Agent SDK][claude-agent-sdk] agents cooperate
inside an AgentCore **Runtime**:

- **Web Search Agent** — a specialist subagent that calls the Gateway's
  `WebSearch` tool.
- **Synthesize Agent** — an orchestrator that decomposes the question, delegates
  searches to the web-search subagent (the "agents as tools" pattern, via the
  SDK's built-in `Agent` tool), and synthesizes a single cited answer.

```txt
  caller ──InvokeAgentRuntime──▶ AgentCore Runtime (ECR image, arm64)
                                   └─ Synthesize Agent (orchestrator · OpenRouter)
                                        └─ Agent tool ▶ Web Search subagent (OpenRouter)
                                             └─ MCP WebSearch tool
                                                       │ Bearer JWT (AgentCore Identity · Cognito M2M)
                                                       ▼
                                            AgentCore Gateway (CUSTOM_JWT)
                                                  └─ target: connector "web-search"
                                                       │ GATEWAY_IAM_ROLE (SigV4)
                                                       ▼
                                            AWS-managed Web Search
```

## Layout

| Path         | What                                                                                    |
| ------------ | --------------------------------------------------------------------------------------- |
| `terraform/` | ECR, Cognito (JWT authorizer), Gateway + web-search target, Runtime, IAM                |
| `agent/`     | Python (Claude Agent SDK) agent + `Dockerfile` — a member of the repo-root uv workspace |

## Prerequisites

- `terraform`, `docker` (with `buildx`), the `aws` CLI, `just`, and `uv`.
- AWS credentials for **us-east-1** (the only region where Web Search is offered).
- An **OpenRouter API key** stored as an SSM Parameter Store **SecureString** at
  `/secret/openrouter-api-key` (override with `var.openrouter_api_key_param`). It
  is read from `var.openrouter_api_key_region` (default `ap-northeast-1`) — Web
  Search pins the stack to us-east-1, so the key is read cross-region from
  wherever it lives. The runtime reads and decrypts it at startup; no model key
  lives in the image or in plain env vars. The Claude Agent SDK speaks the
  Anthropic Messages API, so it talks to OpenRouter's Anthropic-compatible
  endpoint (`https://openrouter.ai/api`). The agents reason with OpenRouter
  models — defaults `minimax/minimax-m2.5` (worker) and `z-ai/glm-5.2`
  (synthesize). Use reliable tool-callers — weak models answer from memory
  instead of invoking `WebSearch`, so the agent never actually searches.
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
- **Agents as tools** — the orchestrator delegates each sub-question to the
  `web-search` subagent through the SDK's built-in `Agent` tool. The subagent is
  defined with its own model (`worker_model_id`) and is restricted to the
  Gateway's `WebSearch` tool; the SDK runs it in its own context and opens/closes
  the MCP connection for it.
- **Tool isolation** — the Claude Agent SDK ships Claude Code's built-in tools
  (a shell, file editing, its own web search). All of them are hidden via
  `disallowed_tools`, so the agents can only ever reach the managed Gateway
  `WebSearch` tool — never run a shell or search the web any other way.
- **Inbound auth** — the Gateway uses a `CUSTOM_JWT` authorizer backed by a
  Cognito machine-to-machine (client_credentials) app client. The runtime does
  not run the token grant or hold the client secret itself: it asks an
  **AgentCore Identity** OAuth2 credential provider (`identity.tf`) for the
  token at invocation time (`@requires_access_token(auth_flow="M2M")`) and
  passes it on the MCP connection. AgentCore Identity keeps the client_id/secret
  in its KMS-encrypted token vault and runs the grant on the runtime's behalf,
  authorized by the runtime's workload identity. Because invocations use IAM
  (SigV4) inbound auth, `just invoke` passes `--runtime-user-id` so AgentCore
  injects the workload access token the agent needs to reach the vault.
- **Outbound auth** — the Gateway reaches the AWS-managed search backend with its
  service role (`GATEWAY_IAM_ROLE`), which holds `bedrock-agentcore:InvokeGateway`
  and `bedrock-agentcore:InvokeWebSearch`.
- **Model** — the Claude Agent SDK reasons with OpenRouter through its
  Anthropic-compatible endpoint (`ANTHROPIC_BASE_URL=https://openrouter.ai/api`,
  authenticated with the OpenRouter key as `ANTHROPIC_AUTH_TOKEN`): the
  orchestrator uses `var.synthesize_model_id`, the web-search subagent uses
  `var.worker_model_id`. The runtime reads the OpenRouter API key from an SSM
  SecureString at startup (execution role: `ssm:GetParameter` + `kms:Decrypt`
  scoped to `kms:ViaService = ssm.*`), so no model key lives in the image or in
  plain env vars. Reaching `openrouter.ai` needs outbound internet, which the
  runtime's `PUBLIC` network mode provides.

## Cost & notes

- Web Search is billed at **$7 per 1,000 queries** (us-east-1), plus OpenRouter
  model tokens and Runtime usage.
- The Cognito client secret is **not** passed to the runtime. AgentCore Identity
  holds it in its token vault (a KMS-encrypted Secrets Manager secret) and the
  runtime reads only a short-lived token from the vault using its workload
  identity (execution role: `bedrock-agentcore:GetResourceOauth2Token` +
  `secretsmanager:GetSecretValue`, scoped to the provider and its secret).
- Per the Web Search acceptable-use terms, keep and display the source citations
  the tool returns — the agents are prompted to do so.

[blog]: https://aws.amazon.com/blogs/aws/announcing-web-search-on-amazon-bedrock-agentcore-ground-your-ai-agents-in-current-accurate-web-knowledge/
[claude-agent-sdk]: https://github.com/anthropics/claude-agent-sdk-python
