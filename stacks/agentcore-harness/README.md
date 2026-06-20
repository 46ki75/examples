# agentcore-harness

A minimal **Amazon Bedrock AgentCore harness** with **web search**: you _declare_
an agent (a default model plus a tool) and AgentCore runs the orchestration loop,
sandboxed compute, memory, identity, and observability for you. No agent code, no
container.

Contrast with [`agentcore-web-search`](../agentcore-web-search), which uses the
**Runtime** path — you bring Strands code in a container and wire the primitives
yourself. The harness is the managed, config-only path (it runs _inside_ Runtime).
Both reach the same managed Web Search, but the harness reaches it over **SigV4**,
so it skips that example's whole Cognito + AgentCore Identity layer (see below).

```txt
caller ──InvokeHarness──▶ AgentCore Harness (AWS runs the loop · Claude Sonnet 4.6)
                            │  built-in shell + file_operations
                            │  agentcore_gateway tool
                            │      │ SigV4 (harness execution role)
                            │      ▼
                            │  AgentCore Gateway (AWS_IAM inbound)
                            │      └─ target: connector "web-search"
                            │           │ GATEWAY_IAM_ROLE (SigV4)
                            │           ▼
                            │      AWS-managed Web Search
                            └─ managed AgentCore Memory (multi-turn continuity)
```

## What gets created

| Resource                              | Purpose                                                                                                                                                                      |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aws_iam_role.harness`                | Execution role the harness assumes (Bedrock invoke, logs, tracing, workload identity, memory `*Event`/`RetrieveMemoryRecords`, and `InvokeGateway` for the web-search tool). |
| `aws_iam_role.gateway`                | Service role the Gateway assumes to reach managed Web Search (`InvokeGateway` + `InvokeWebSearch`).                                                                          |
| `aws_bedrockagentcore_gateway.this`   | The Gateway, with an **AWS_IAM** inbound authorizer (no Cognito/JWT).                                                                                                        |
| `terraform_data.web_search_target`    | Creates the built-in `web-search` connector target on the Gateway (via a boto3 helper — the `connector` type isn't modeled by the providers yet).                            |
| `awscc_bedrockagentcore_harness.this` | The harness: one default model, built-in `shell` + `file_operations` tools, the `agentcore_gateway` web-search tool, and managed memory.                                     |

A **managed AgentCore Memory** is auto-provisioned (because the `memory` block is
omitted): `SEMANTIC` + `SUMMARIZATION` strategies, 30-day event expiry. It gives
multi-turn continuity keyed on the runtime session id, and cascade-deletes with
the harness.

## Deploy & invoke

```sh
just deploy     # terraform init + apply (role, gateway + web-search target, harness)
just invoke     # streams two turns through the deployed harness
just destroy
```

`just invoke` runs `invoke.py` twice with the **same** `runtimeSessionId`. The
first turn asks for current information, so the agent calls the Gateway's
`web_search` tool and answers with cited sources; the second is a follow-up
answered from managed memory (the result is never re-sent). Tool calls are
surfaced inline as `[tool: ...]` so you can watch the search fire.

## How the pieces fit

- **Web search as a Gateway tool** — the harness `tools` block references the
  Gateway by ARN (`agentcore_gateway`); every tool configured on that Gateway
  (here, the built-in `web-search` connector) becomes callable. `allowed_tools`
  is left unset, so all tools (the built-ins plus the gateway's) stay available.
- **All IAM, no OAuth** — the Gateway uses an **AWS_IAM inbound authorizer**, so
  callers are authorized by their IAM identity. The harness's default
  `agentcore_gateway` outbound auth is **AWS IAM (SigV4)** signed with its own
  execution role, which therefore just needs `bedrock-agentcore:InvokeGateway`
  on the Gateway. That collapses the runtime example's Cognito user pool +
  AgentCore Identity OAuth2 provider down to two IAM grants, because AWS runs the
  loop and signs natively.
- **Connector target** — the built-in `web-search` connector is created by a
  small boto3 helper (`web_search_target.py`) invoked from `terraform_data`
  (`gateway_target.tf`). Neither the native `aws_bedrockagentcore_gateway_target`
  resource nor the bundled `aws` CLI model the `connector` target type yet, so
  the helper runs as a self-contained PEP 723 script via `uv run --script` to use
  a boto3 new enough to know the shape. Everything else is native Terraform/awscc.
- **Gateway outbound** — the Gateway reaches the AWS-managed search backend with
  its service role (`aws_iam_role.gateway`: `InvokeGateway` + `InvokeWebSearch`).

## Notes & decisions

- **Model must be a native Converse tool-caller.** The default is Claude
  **Sonnet 4.6** (`us.anthropic.claude-sonnet-4-6`, via its `us` geo inference
  profile — Sonnet 4.6 has no in-region profile in us-east-1) with
  `api_format = "converse_stream"`. Models served through the OpenAI-compatible
  **Bedrock Mantle** endpoint (`chat_completions`/`responses`, e.g.
  `moonshotai.kimi-k2.5`) emit OpenAI-style tool IDs (`functions.<name>:0`) that
  the harness's tool-result schema rejects (`^[a-zA-Z0-9_-]+$`), so they only
  work **tool-free**. Keep `converse_stream` whenever the `web_search` tool is
  attached; override `model_id`/`api_format` for a tool-free harness.
- **Region** is pinned to `us-east-1` (the only region where Web Search is
  offered), for both the `aws` and `awscc` providers.
- **Provider:** the harness is not yet in the native `hashicorp/aws` provider, so
  it is provisioned through **`awscc`** (`AWS::BedrockAgentCore::Harness` via Cloud
  Control). The Gateway and IAM roles use native `hashicorp/aws`. Note `awscc`
  exposes the `agentcore_gateway` tool but **not** the simpler native
  `agentcore_web_search` tool type yet (it isn't in the CloudFormation schema), so
  the Gateway path above is the declarative way to attach web search today.
- **Caller IAM:** the principal running `terraform apply` needs `CreateHarness`
  and `CreateGateway`/`CreateGatewayTarget`, **plus** `CreateAgentRuntime` and
  `CreateMemory` (the harness wraps a Runtime and provisions the managed Memory).
- **Memory in Terraform:** `awscc` exposes only managed-default (omit `memory`) or
  bring-your-own (`memory = { agent_core_memory_configuration = { arn = ... } }`).
  The API's managed-strategy tuning and `disabled` mode are not expressible yet.
- **Pricing:** no separate harness charge — you pay only for the underlying
  AgentCore services (Runtime, Memory, model inference) consumed. Web Search is
  billed at **$7 per 1,000 queries** (us-east-1).
