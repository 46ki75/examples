variable "name_prefix" {
  description = "Prefix applied to resource names (IAM role, etc.). Hyphens allowed here; the harness name has its own variable because it forbids them."
  type        = string
  default     = "46ki75-agentcore-harness"
}

variable "harness_name" {
  description = "Name of the AgentCore harness. AWS pattern ^[a-zA-Z][a-zA-Z0-9_]{0,39}$ — letters, digits, and underscores only (no hyphens), max 40 chars."
  type        = string
  default     = "hello_harness"

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]{0,39}$", var.harness_name))
    error_message = "harness_name must match ^[a-zA-Z][a-zA-Z0-9_]{0,39}$ (no hyphens)."
  }
}

variable "model_id" {
  description = "Default Bedrock model the harness reasons with. Kimi K2.5 is available in-region in us-east-1 (no geo/global inference profile), so the plain model ID is used. Override per InvokeHarness call to swap models mid-session."
  type        = string
  default     = "moonshotai.kimi-k2.5"
}

variable "api_format" {
  description = "Bedrock API protocol + endpoint the harness calls: 'converse_stream' (Converse on bedrock-runtime, the default for most models), or 'responses'/'chat_completions' (OpenAI-compatible, served by the bedrock-mantle endpoint). Kimi K2.5 is served via Mantle."
  type        = string
  default     = "chat_completions"

  validation {
    condition     = contains(["converse_stream", "responses", "chat_completions"], var.api_format)
    error_message = "api_format must be 'converse_stream', 'responses', or 'chat_completions'."
  }
}

variable "max_iterations" {
  description = "Max agent-loop iterations per invocation. Null uses the service default."
  type        = number
  default     = null
}

variable "timeout_seconds" {
  description = "Max wall-clock seconds per invocation. Null uses the service default."
  type        = number
  default     = null
}
