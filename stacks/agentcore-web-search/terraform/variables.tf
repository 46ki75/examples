variable "name_prefix" {
  description = "Prefix applied to resource names."
  type        = string
  default     = "46ki75-agentcore-web-search"
}

variable "worker_model_id" {
  description = "Model ID the web-search worker sub-agents reason with. Null picks a default for llm_auth_mode (an OpenRouter ID, or a Claude ID for subscription). Must be a reliable tool-caller — weak models answer from memory instead of invoking the WebSearch tool."
  type        = string
  default     = null
}

variable "synthesize_model_id" {
  description = "Model ID the synthesize orchestrator reasons with. Null picks a default for llm_auth_mode (an OpenRouter ID, or a Claude ID for subscription)."
  type        = string
  default     = null
}

variable "llm_auth_mode" {
  description = "How the Claude Agent SDK authenticates its model calls: 'subscription' (the default — a Claude Pro/Max OAuth token from `claude setup-token`; Claude models only) or 'openrouter' (OpenRouter API key). Anthropic sizes subscription credits for individual experimentation/automation — use an API key for shared production at scale."
  type        = string
  default     = "subscription"

  validation {
    condition     = contains(["openrouter", "subscription"], var.llm_auth_mode)
    error_message = "llm_auth_mode must be 'openrouter' or 'subscription'."
  }
}

variable "claude_code_oauth_token_param" {
  description = "SSM Parameter Store name (SecureString) holding the Claude Code subscription OAuth token from `claude setup-token`. Used only when llm_auth_mode = 'subscription'."
  type        = string
  default     = "/secret/claude-code-oauth-token"
}

variable "claude_code_oauth_token_region" {
  description = "Region the Claude Code OAuth token SecureString lives in. May differ from the stack region (which Web Search pins to us-east-1); read cross-region."
  type        = string
  default     = "ap-northeast-1"
}

variable "openrouter_api_key_param" {
  description = "SSM Parameter Store name (SecureString) holding the OpenRouter API key. The runtime reads and decrypts it at startup."
  type        = string
  default     = "/secret/openrouter-api-key"
}

variable "openrouter_api_key_region" {
  description = "Region the OpenRouter API key SecureString lives in. May differ from the stack region (which Web Search pins to us-east-1); the key is read cross-region."
  type        = string
  default     = "ap-northeast-1"
}

variable "image_tag" {
  description = "Tag of the agent container image in ECR that the runtime serves."
  type        = string
  default     = "latest"
}
