# AgentCore Web Search

A runnable example of [Web Search on Amazon Bedrock AgentCore][blog] — a fully
managed, MCP-compliant web search tool exposed as a built-in connector on an
AgentCore **Gateway**. Two [Strands Agents][strands] cooperate inside an
AgentCore **Runtime**:

- **Web Search Agent** — a specialist that calls the Gateway's `WebSearch` tool.
- **Synthesize Agent** — an orchestrator that decomposes the question, fans out
  searches through the web-search agent (the "agents as tools" pattern), and
  synthesizes a single cited answer.

```
  caller ──InvokeAgentRuntime──▶ AgentCore Runtime (ECR image, arm64)
                                   └─ Synthesize Agent (orchestrator, Bedrock)
                                        └─ tool: web_search  (agents as tools)
                                             └─ Web Search Agent (Bedrock)
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

| Path         | What                                                              |
| ------------ | ---------------------------------------------------------------- |
| `terraform/` | ECR, Cognito (JWT authorizer), Gateway + web-search target, Runtime, IAM |
| `agent/`     | Python (Strands) agent + `Dockerfile` — a member of the repo-root uv workspace |

## Prerequisites

- `terraform`, `docker` (with `buildx`), the `aws` CLI, `just`, and `uv`.
- AWS credentials for **us-east-1** (the only region where Web Search is offered).
- Bedrock model access enabled for `var.bedrock_model_id`
  (default `us.amazon.nova-pro-v1:0`) in this account/region.
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

- **Gateway target** — the built-in `web-search` connector is created via the AWS
  CLI inside a `terraform_data` resource (`gateway_target.tf`). The native
  `aws_bedrockagentcore_gateway_target` resource does not yet model the
  `connector` target type; everything else is native Terraform.
- **Inbound auth** — the Gateway uses a `CUSTOM_JWT` authorizer backed by a
  Cognito machine-to-machine (client_credentials) app client. The agent mints a
  bearer token at startup and passes it on the MCP connection.
- **Outbound auth** — the Gateway reaches the AWS-managed search backend with its
  service role (`GATEWAY_IAM_ROLE`), which holds `bedrock-agentcore:InvokeGateway`
  and `bedrock-agentcore:InvokeWebSearch`.
- **Model** — the Strands agents reason with Amazon Bedrock; the runtime
  execution role calls `bedrock:InvokeModel`, so no model API key lives in the
  container.

## Cost & notes

- Web Search is billed at **$7 per 1,000 queries** (us-east-1), plus Bedrock model
  tokens and Runtime usage.
- The Cognito client secret is passed to the runtime as a plain environment
  variable for example simplicity. In production, store it in Secrets Manager and
  grant the runtime role read access instead.
- Per the Web Search acceptable-use terms, keep and display the source citations
  the tool returns — the agents are prompted to do so.

[blog]: https://aws.amazon.com/blogs/aws/announcing-web-search-on-amazon-bedrock-agentcore-ground-your-ai-agents-in-current-accurate-web-knowledge/
[strands]: https://strandsagents.com/
