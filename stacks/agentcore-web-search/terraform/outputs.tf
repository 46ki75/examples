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

output "cognito_client_id" {
  description = "Cognito M2M app client ID (the Gateway's allowed client)."
  value       = aws_cognito_user_pool_client.gateway.id
}

output "gateway_oauth_provider" {
  description = "AgentCore Identity OAuth2 credential provider that vends the Gateway token."
  value       = aws_bedrockagentcore_oauth2_credential_provider.gateway.name
}

output "invoke_command" {
  description = "Copy-paste command to invoke the deployed agent."
  value       = <<-EOT
    aws bedrock-agentcore invoke-agent-runtime \
      --region ${local.region} \
      --agent-runtime-arn ${aws_bedrockagentcore_agent_runtime.this.agent_runtime_arn} \
      --qualifier live \
      --runtime-session-id "$(uuidgen | tr -d '-')$(uuidgen | tr -d '-')" \
      --runtime-user-id web-search-cli \
      --payload '{"prompt":"What did AWS recently announce about AgentCore web search?"}' \
      --content-type application/json --accept application/json /dev/stdout
  EOT
}
