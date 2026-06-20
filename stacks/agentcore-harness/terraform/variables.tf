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
  description = "Default Bedrock model the harness reasons with. Defaults to Claude Sonnet 4.6 via its us geo inference profile (Sonnet 4.6 has no in-region profile in us-east-1). A native Converse tool-caller is required for the web_search tool: models served through the bedrock-mantle endpoint (e.g. moonshotai.kimi-k2.5) emit OpenAI-style tool IDs the harness rejects, so they only work tool-free. Override per InvokeHarness call to swap models mid-session."
  type        = string
  default     = "us.anthropic.claude-sonnet-4-6"
}

variable "api_format" {
  description = "Bedrock API protocol + endpoint the harness calls: 'converse_stream' (Converse on bedrock-runtime — required here for tool use, since its tool IDs satisfy the harness schema), or 'responses'/'chat_completions' (OpenAI-compatible, served by the bedrock-mantle endpoint; usable only without tools)."
  type        = string
  default     = "converse_stream"

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
