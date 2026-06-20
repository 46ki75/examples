# Holds the agent container image that the AgentCore Runtime serves.
# The image must exist before `aws_bedrockagentcore_agent_runtime` is created
# (see the stack README for the apply order).
resource "aws_ecr_repository" "agent" {
  name                 = var.name_prefix
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}
