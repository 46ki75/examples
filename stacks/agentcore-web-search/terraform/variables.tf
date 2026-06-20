variable "name_prefix" {
  description = "Prefix applied to resource names."
  type        = string
  default     = "46ki75-agentcore-web-search"
}

variable "worker_model_id" {
  description = "OpenRouter model ID the web-search worker sub-agents reason with. Must be a reliable tool-caller — weak models answer from memory instead of invoking the WebSearch tool."
  type        = string
  default     = "minimax/minimax-m2.5"
}

variable "synthesize_model_id" {
  description = "OpenRouter model ID the synthesize orchestrator reasons with."
  type        = string
  default     = "z-ai/glm-5.2"
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
