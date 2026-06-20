variable "name_prefix" {
  description = "Prefix applied to resource names."
  type        = string
  default     = "46ki75-agentcore-web-search"
}

variable "bedrock_model_id" {
  description = "Bedrock model (or inference profile) ID the Strands agents reason with. Must be enabled for this account in us-east-1."
  type        = string
  default     = "us.amazon.nova-pro-v1:0"
}

variable "image_tag" {
  description = "Tag of the agent container image in ECR that the runtime serves."
  type        = string
  default     = "latest"
}
