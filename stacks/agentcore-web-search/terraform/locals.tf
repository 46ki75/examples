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

  # Model auth mode selects which SSM SecureString the runtime reads its model
  # credential from, and which default model IDs apply. The OpenRouter API key
  # and the Claude Code subscription OAuth token are mutually exclusive credentials
  # for the SDK (see agent/src/agentcore_web_search/model_auth.py).
  model_secret_param  = var.llm_auth_mode == "subscription" ? var.claude_code_oauth_token_param : var.openrouter_api_key_param
  model_secret_region = var.llm_auth_mode == "subscription" ? var.claude_code_oauth_token_region : var.openrouter_api_key_region

  # Subscription auth reaches Anthropic directly, so its defaults are Claude IDs;
  # OpenRouter mode defaults to OpenRouter-hosted IDs. var.*_model_id overrides.
  default_model_ids = {
    openrouter   = { worker = "minimax/minimax-m2.5", synthesize = "z-ai/glm-5.2" }
    subscription = { worker = "claude-haiku-4-5", synthesize = "claude-sonnet-4-6" }
  }
  worker_model_id     = coalesce(var.worker_model_id, local.default_model_ids[var.llm_auth_mode].worker)
  synthesize_model_id = coalesce(var.synthesize_model_id, local.default_model_ids[var.llm_auth_mode].synthesize)
}
