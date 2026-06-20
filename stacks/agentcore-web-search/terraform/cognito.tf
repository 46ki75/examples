# Cognito provides the CUSTOM_JWT authorizer for the Gateway. A machine-to-machine
# (client_credentials) app client lets a bearer token be minted with no user
# interaction; the Gateway validates that token against this pool's OIDC metadata.
# The client_id/secret are handed to an AgentCore Identity OAuth2 credential
# provider (see identity.tf), which runs the grant on the runtime's behalf.

resource "aws_cognito_user_pool" "gateway" {
  name = "${var.name_prefix}-pool"
}

resource "aws_cognito_user_pool_domain" "gateway" {
  # Hosted-UI domain prefix must be globally unique; scope it with the account ID.
  domain       = "${var.name_prefix}-${data.aws_caller_identity.current.account_id}"
  user_pool_id = aws_cognito_user_pool.gateway.id
}

resource "aws_cognito_resource_server" "gateway" {
  identifier   = "agentcore-gateway"
  name         = "${var.name_prefix}-resource-server"
  user_pool_id = aws_cognito_user_pool.gateway.id

  scope {
    scope_name        = "invoke"
    scope_description = "Invoke the AgentCore Gateway"
  }
}

resource "aws_cognito_user_pool_client" "gateway" {
  name         = "${var.name_prefix}-m2m-client"
  user_pool_id = aws_cognito_user_pool.gateway.id

  generate_secret                      = true
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["client_credentials"]
  allowed_oauth_scopes                 = ["${aws_cognito_resource_server.gateway.identifier}/invoke"]
  supported_identity_providers         = ["COGNITO"]
}
