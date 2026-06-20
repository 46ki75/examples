# agentcore-harness

A minimal **Amazon Bedrock AgentCore harness** ("hello harness"): you _declare_ an
agent (just a default model) and AgentCore runs the orchestration loop, sandboxed
compute, memory, identity, and observability for you. No agent code, no container.

Contrast with [`agentcore-web-search`](../agentcore-web-search), which uses the
**Runtime** path — you bring Strands code in a container and wire the primitives
yourself. The harness is the managed, config-only path (it runs _inside_ Runtime).

## What gets created

| Resource | Purpose |
| --- | --- |
| `aws_iam_role.harness` | Execution role the harness assumes (Bedrock invoke, logs, tracing, workload identity, and memory `*Event`/`RetrieveMemoryRecords` — the runtime reads/writes memory with this role). |
| `awscc_bedrockagentcore_harness.this` | The harness itself: one default model, built-in `shell` + `file_operations` tools, managed memory. |

A **managed AgentCore Memory** is auto-provisioned (because the `memory` block is
omitted): `SEMANTIC` + `SUMMARIZATION` strategies, 30-day event expiry. It gives
multi-turn continuity keyed on the runtime session id, and cascade-deletes with
the harness.

## Deploy & invoke

```sh
just deploy     # terraform init + apply
just invoke     # streams two turns through the deployed harness
just destroy
```

`just invoke` runs `invoke.py` twice with the **same** `runtimeSessionId` — it
tells the agent a name, then asks for it back, demonstrating that you send only
the new message and the harness reloads history from memory itself.

## Notes & decisions

- **Region** is pinned to `us-east-1`. The default model is Moonshot **Kimi K2.5**
  (`moonshotai.kimi-k2.5`), served through the OpenAI-compatible **Bedrock Mantle**
  endpoint by setting `api_format = "chat_completions"` (`responses` also works).
  Kimi K2.5 is available in-region in us-east-1, so no inference profile / `us.`
  prefix is needed. Override the model or `api_format` per `InvokeHarness` call to
  swap models mid-session.
- **Provider:** the harness is not yet in the native `hashicorp/aws` provider, so
  it is provisioned through **`awscc`** (`AWS::BedrockAgentCore::Harness` via Cloud
  Control). Confirm/bump the `awscc` version floor in `provider.tf` against the
  registry — the resource must exist in the version you resolve.
- **Caller IAM:** the principal running `terraform apply` needs `CreateHarness`
  **plus** `CreateAgentRuntime` and `CreateMemory` (the harness wraps a Runtime and
  provisions the managed Memory).
- **Memory in Terraform:** `awscc` exposes only managed-default (omit `memory`) or
  bring-your-own (`memory = { agent_core_memory_configuration = { arn = ... } }`).
  The API's managed-strategy tuning and `disabled` mode are not expressible yet.
- **Pricing:** no separate harness charge — you pay only for the underlying
  AgentCore services (Runtime, Memory, model inference) consumed.
