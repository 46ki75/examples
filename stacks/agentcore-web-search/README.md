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
                                   └─ Synthesize Agent (orchestrator)
                                        └─ Agent tool ▶ Web Search subagent
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
- A model credential in SSM, depending on `var.llm_auth_mode`:
  - **`subscription` (default)** — a **Claude Pro/Max** OAuth token from
    `claude setup-token`, stored as an SSM **SecureString** at
    `/secret/claude-code-oauth-token` (override with
    `var.claude_code_oauth_token_param`). Model usage is billed to your Claude
    plan; only Claude models work (defaults `claude-sonnet-4-6` /
    `claude-haiku-4-5`). See [Model auth modes](#model-auth-modes).
  - **`openrouter`** — an **OpenRouter API key** at `/secret/openrouter-api-key`
    (override with `var.openrouter_api_key_param`). The SDK then talks to
    OpenRouter's Anthropic-compatible endpoint (`https://openrouter.ai/api`) and
    the agents reason with OpenRouter models (defaults `minimax/minimax-m2.5` /
    `z-ai/glm-5.2`). Use reliable tool-callers — weak models answer from memory
    instead of invoking `WebSearch`, so the agent never actually searches.

  Either way the runtime reads and decrypts the credential at startup (read
  cross-region from `ap-northeast-1` by default, since Web Search pins the stack
  to us-east-1); no model credential lives in the image or in plain env vars.

- Docker able to build `linux/arm64` (native on Apple Silicon / Graviton; on
  x86 hosts enable QEMU: `docker run --privileged --rm tonistiigi/binfmt --install arm64`).

## Deploy

The Runtime needs its container image to already exist in ECR, so deploy in order
(all wrapped in the `justfile`):

```bash
just deploy        # init → create ECR → build/push image → apply the rest
just invoke prompt="What changed in the AWS CLI this week?"
```

`just deploy` uses the **default `subscription` mode**, so store your Claude token
first (see [Model auth](#model-auth-subscription-default-vs-openrouter) below), or
pass `auth_mode=openrouter` to use OpenRouter instead.

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

### Model auth: subscription (default) vs. OpenRouter

The default mode bills model usage to a **Claude Pro/Max subscription**. Mint a
one-year token and store it as the SecureString the runtime reads:

```bash
# Prints the token to the terminal; it is not saved anywhere.
claude setup-token

aws ssm put-parameter --type SecureString \
  --name /secret/claude-code-oauth-token --value "<token>" \
  --region ap-northeast-1
```

`just deploy` / `just apply` then use it (Claude models only; defaults
`claude-sonnet-4-6` / `claude-haiku-4-5`). The token is valid for one year and
does not auto-refresh — regenerate it (`put-parameter … --overwrite`) before it
expires; the runtime re-reads SSM each invocation, so no redeploy is needed.

To route through **OpenRouter** instead, store an OpenRouter key at
`/secret/openrouter-api-key` and pass the mode (switching mode only changes
runtime env vars — `apply` alone creates a new runtime version, no image rebuild):

```bash
just auth_mode=openrouter apply     # switch an already-deployed stack
just auth_mode=openrouter deploy    # or a full deploy from scratch
```

See [Model auth modes](#model-auth-modes) for the constraints.

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

<a id="model-auth-modes"></a>

- **Model auth modes** — `var.llm_auth_mode` selects how the Claude Agent SDK
  authenticates its model calls. The orchestrator reasons with
  `var.synthesize_model_id` and the web-search subagent with `var.worker_model_id`;
  each defaults to a mode-appropriate model.
  - `subscription` (default): the SDK's bundled CLI authenticates a Claude Pro/Max
    plan with a `claude setup-token` OAuth token (`CLAUDE_CODE_OAUTH_TOKEN`). This
    reaches Anthropic directly, so only Claude models are valid (defaults
    `claude-sonnet-4-6` / `claude-haiku-4-5`). The runtime clears any `ANTHROPIC_*`
    vars first — they outrank the OAuth token in the CLI's auth precedence.
    Anthropic sizes the SDK's subscription credit for _individual experimentation
    and automation_ and directs shared production at scale to a Claude Platform API
    key (use `openrouter`, or a direct Anthropic key, for that).
  - `openrouter`: the SDK speaks the Anthropic Messages API to OpenRouter's
    Anthropic-compatible endpoint (`ANTHROPIC_BASE_URL=https://openrouter.ai/api`,
    OpenRouter key as `ANTHROPIC_AUTH_TOKEN`). Defaults
    `z-ai/glm-5.2` / `minimax/minimax-m2.5`.

  Either credential is stored as an SSM SecureString and read at startup
  (execution role: `ssm:GetParameter` + `kms:Decrypt` scoped to
  `kms:ViaService = ssm.*`), so no model credential lives in the image or in plain
  env vars. Reaching the model endpoint needs outbound internet, which the
  runtime's `PUBLIC` network mode provides.

## Cost & notes

- Web Search is billed at **$7 per 1,000 queries** (us-east-1), plus model usage
  (OpenRouter tokens, or — in `subscription` mode — your Claude plan's credit) and
  Runtime usage.
- In `subscription` mode the `claude setup-token` OAuth token is a credential for
  your Claude plan: store it only as an SSM SecureString (never in the image or
  plain env vars), and note it is valid for one year with no auto-refresh. The
  subscription credit is meant for individual experimentation/automation — switch
  to an API key (`openrouter` mode or a direct Anthropic key) for shared
  production at scale.
- The Cognito client secret is **not** passed to the runtime. AgentCore Identity
  holds it in its token vault (a KMS-encrypted Secrets Manager secret) and the
  runtime reads only a short-lived token from the vault using its workload
  identity (execution role: `bedrock-agentcore:GetResourceOauth2Token` +
  `secretsmanager:GetSecretValue`, scoped to the provider and its secret).
- Per the Web Search acceptable-use terms, keep and display the source citations
  the tool returns — the agents are prompted to do so.

[blog]: https://aws.amazon.com/blogs/aws/announcing-web-search-on-amazon-bedrock-agentcore-ground-your-ai-agents-in-current-accurate-web-knowledge/
[claude-agent-sdk]: https://github.com/anthropics/claude-agent-sdk-python
