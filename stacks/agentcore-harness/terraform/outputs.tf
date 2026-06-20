output "harness_arn" {
  description = "ARN of the AgentCore harness (pass to InvokeHarness)."
  value       = awscc_bedrockagentcore_harness.this.arn
}

output "harness_id" {
  description = "Identifier of the AgentCore harness."
  value       = awscc_bedrockagentcore_harness.this.harness_id
}

output "harness_status" {
  description = "Provisioning status of the harness (READY when invokable)."
  value       = awscc_bedrockagentcore_harness.this.status
}

output "gateway_id" {
  description = "Identifier of the AgentCore Gateway backing the web-search tool."
  value       = aws_bedrockagentcore_gateway.this.gateway_id
}

output "gateway_arn" {
  description = "ARN of the AgentCore Gateway attached to the harness as the web-search tool."
  value       = aws_bedrockagentcore_gateway.this.gateway_arn
}

output "invoke_command" {
  description = "Copy-paste command to stream two turns through the harness."
  value       = "uv run --script invoke.py ${awscc_bedrockagentcore_harness.this.arn}"
}
