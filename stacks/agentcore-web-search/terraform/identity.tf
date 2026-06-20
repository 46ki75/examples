# --- AgentCore Identity: Gateway OAuth2 credential provider -------------------
# Instead of the agent hand-rolling the Cognito client_credentials POST (and
# holding the client secret in a plain env var), AgentCore Identity stores the
# client_id/secret in its token vault and runs the machine-to-machine grant on
# the runtime's behalf. The runtime fetches the resulting bearer token at
# invocation time via GetResourceOauth2Token, authorized by its workload
# identity — so the secret never reaches the container.
#
# CustomOauth2 + an OIDC discovery URL is the generic path for any standards
# compliant authorization server (here, the same Cognito user pool the Gateway's
# CUSTOM_JWT authorizer trusts). M2M (client_credentials) needs no callback URL.

resource "aws_bedrockagentcore_oauth2_credential_provider" "gateway" {
  name                       = local.oauth_provider_name
  credential_provider_vendor = "CustomOauth2"

  oauth2_provider_config {
    custom_oauth2_provider_config {
      client_id     = aws_cognito_user_pool_client.gateway.id
      client_secret = aws_cognito_user_pool_client.gateway.client_secret

      oauth_discovery {
        discovery_url = local.cognito_discovery_url
      }
    }
  }
}
