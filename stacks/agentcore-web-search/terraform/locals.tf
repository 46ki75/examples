data "aws_caller_identity" "current" {}

locals {
  region     = "us-east-1"
  account_id = data.aws_caller_identity.current.account_id

  # Cognito OIDC metadata the Gateway validates inbound tokens against, and the
  # client_credentials scope AgentCore Identity requests on the agent's behalf.
  cognito_discovery_url = "https://cognito-idp.${local.region}.amazonaws.com/${aws_cognito_user_pool.gateway.id}/.well-known/openid-configuration"
  cognito_scope         = "${aws_cognito_resource_server.gateway.identifier}/invoke"

  # AgentCore Identity OAuth2 credential provider (and its token-vault-backed
  # Secrets Manager secret) that vends the Gateway bearer token to the runtime.
  oauth_provider_name = "${var.name_prefix}-gateway"
}
