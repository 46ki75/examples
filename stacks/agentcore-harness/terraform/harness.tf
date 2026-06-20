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
      # Selects the protocol and Bedrock endpoint: chat_completions / responses
      # route through the OpenAI-compatible bedrock-mantle endpoint (Kimi K2.5),
      # converse_stream uses the native bedrock-runtime Converse API.
      api_format = var.api_format
    }
  }

  max_iterations  = var.max_iterations
  timeout_seconds = var.timeout_seconds

  depends_on = [time_sleep.role_propagation]
}
