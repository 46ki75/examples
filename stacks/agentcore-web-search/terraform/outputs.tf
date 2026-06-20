output "gateway_url" {
  description = "MCP endpoint URL of the AgentCore Gateway."
  value       = aws_bedrockagentcore_gateway.this.gateway_url
}

output "gateway_id" {
  description = "Identifier of the AgentCore Gateway."
  value       = aws_bedrockagentcore_gateway.this.gateway_id
}

output "ecr_repository_url" {
  description = "ECR repository the agent image is pushed to."
  value       = aws_ecr_repository.agent.repository_url
}

output "agent_runtime_arn" {
  description = "ARN of the AgentCore Runtime (use with invoke-agent-runtime)."
  value       = aws_bedrockagentcore_agent_runtime.this.agent_runtime_arn
}

output "cognito_token_url" {
  description = "Cognito client_credentials token endpoint."
  value       = local.cognito_token_url
}

output "cognito_client_id" {
  description = "Cognito M2M app client ID."
  value       = aws_cognito_user_pool_client.gateway.id
}

output "cognito_client_secret" {
  description = "Cognito M2M app client secret."
  value       = aws_cognito_user_pool_client.gateway.client_secret
  sensitive   = true
}

output "invoke_command" {
  description = "Copy-paste command to invoke the deployed agent."
  value       = <<-EOT
    aws bedrock-agentcore invoke-agent-runtime \
      --region ${local.region} \
      --agent-runtime-arn ${aws_bedrockagentcore_agent_runtime.this.agent_runtime_arn} \
      --qualifier live \
      --runtime-session-id "$(uuidgen | tr -d '-')$(uuidgen | tr -d '-')" \
      --payload '{"prompt":"What did AWS recently announce about AgentCore web search?"}' \
      --content-type application/json --accept application/json /dev/stdout
  EOT
}
