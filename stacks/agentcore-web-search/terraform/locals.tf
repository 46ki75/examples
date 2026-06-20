data "aws_caller_identity" "current" {}

locals {
  region     = "us-east-1"
  account_id = data.aws_caller_identity.current.account_id

  # Cognito machine-to-machine (client_credentials) endpoints the agent uses to
  # mint a bearer token, and that the Gateway uses to validate it.
  cognito_token_url     = "https://${aws_cognito_user_pool_domain.gateway.domain}.auth.${local.region}.amazoncognito.com/oauth2/token"
  cognito_discovery_url = "https://cognito-idp.${local.region}.amazonaws.com/${aws_cognito_user_pool.gateway.id}/.well-known/openid-configuration"
  cognito_scope         = "${aws_cognito_resource_server.gateway.identifier}/invoke"
}
