# --- AgentCore harness --------------------------------------------------------
# A declarative agent: a default model and nothing else. The built-in `shell` and
# `file_operations` tools are always present, so no `tools` or `skills` are
# configured here.
#
# `memory` is intentionally omitted. That triggers the GA managed default: an
# auto-provisioned, customer-owned AgentCore Memory (SEMANTIC + SUMMARIZATION
# strategies, 30-day event expiry) giving multi-turn continuity keyed on the
# runtime session id (and actor id, if passed). It cascade-deletes with the
# harness. To go stateless instead you would attach a BYO memory ARN via
# `memory = { agent_core_memory_configuration = { arn = ... } }` — awscc does not
# expose the API's managed-tuning or `disabled` options, so managed-default
# (omit) vs BYO-ARN are the two paths available in Terraform today.
#
# Provisioned through awscc because the harness is not yet in hashicorp/aws.

# IAM is eventually consistent: AgentCore Control assumes the execution role to
# validate it during CreateHarness. On a from-scratch apply the role may not have
# propagated to the service yet, surfacing as "Role validation failed". Give
# propagation a brief head start before creating the harness.
resource "time_sleep" "role_propagation" {
  depends_on      = [aws_iam_role_policy.harness]
  create_duration = "20s"
}

resource "awscc_bedrockagentcore_harness" "this" {
  harness_name       = var.harness_name
  execution_role_arn = aws_iam_role.harness.arn

  model = {
    bedrock_model_config = {
      model_id = var.model_id
      # Selects the protocol and Bedrock endpoint: converse_stream uses the
      # native bedrock-runtime Converse API (its tool IDs satisfy the harness's
      # tool-result schema, so it is required for the web_search tool below);
      # chat_completions / responses route through the OpenAI-compatible
      # bedrock-mantle endpoint, which is tool-free here (those models emit
      # OpenAI-style tool IDs the harness rejects).
      api_format = var.api_format
    }
  }

  # Web search as a governed tool surface. Reference the Gateway by ARN and every
  # tool configured on it — here just the built-in "web-search" connector
  # (gateway_target.tf) — becomes callable by the agent. `outbound_auth` is
  # omitted, so it defaults to AWS IAM (SigV4) signed with this harness's
  # execution role; that role's bedrock-agentcore:InvokeGateway grant (iam.tf)
  # satisfies the Gateway's AWS_IAM inbound authorizer. `allowed_tools` is left
  # unset, so all tools (the built-in shell + file_operations and this gateway's
  # tools) stay available.
  tools = [{
    name = "web_search"
    type = "agentcore_gateway"
    config = {
      agent_core_gateway = {
        gateway_arn = aws_bedrockagentcore_gateway.this.gateway_arn
      }
    }
  }]

  max_iterations  = var.max_iterations
  timeout_seconds = var.timeout_seconds

  # Tune the managed runtime that backs the harness. `agent_core_runtime_environment`
  # is the only environment provider; its `agent_runtime_*` fields are read-only (the
  # runtime is auto-provisioned), so we set only the lifecycle knobs. Omitting this
  # block leaves the platform default idle timeout of 900s. Valid range 60-28800s.
  environment = {
    agent_core_runtime_environment = {
      lifecycle_configuration = {
        idle_runtime_session_timeout = 60
      }
    }
  }

  # The connector target must be READY before the harness enumerates the
  # gateway's tools, so order it ahead of (and the role delay alongside) create.
  depends_on = [time_sleep.role_propagation, terraform_data.web_search_target]
}
