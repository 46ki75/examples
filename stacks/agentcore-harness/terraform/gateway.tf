# --- Gateway: the web-search tool surface for the harness ---------------------
# The harness reaches managed Web Search through an AgentCore Gateway. The
# built-in "web-search" connector is attached as a Gateway target (see
# gateway_target.tf); referencing the gateway ARN from the harness `tools` block
# (harness.tf) makes every tool on it available to the agent.
#
# Inbound auth is AWS_IAM: callers are authorized by their IAM identity, so no
# Cognito user pool or JWT is involved. The harness signs its Gateway calls with
# SigV4 using its own execution role (the default `agentcore_gateway` outbound
# auth), which therefore just needs `bedrock-agentcore:InvokeGateway` (iam.tf).
# Contrast stacks/agentcore-web-search, where a Strands runtime reaches the same
# Gateway over MCP and needs a CUSTOM_JWT authorizer + AgentCore Identity to mint
# bearer tokens — the harness drops that whole layer because AWS runs the loop
# and signs with IAM natively.

# Service role the Gateway assumes to reach the AWS-managed Web Search backend.
# Web Search needs InvokeGateway + InvokeWebSearch (checked per request against
# the service-owned tool ARN).
data "aws_iam_policy_document" "gateway_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["bedrock-agentcore.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [local.account_id]
    }

    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = ["arn:aws:bedrock-agentcore:${local.region}:${local.account_id}:gateway/*"]
    }
  }
}

resource "aws_iam_role" "gateway" {
  name               = "${var.name_prefix}-gateway-role"
  assume_role_policy = data.aws_iam_policy_document.gateway_assume.json
}

data "aws_iam_policy_document" "gateway" {
  statement {
    sid       = "InvokeGateway"
    effect    = "Allow"
    actions   = ["bedrock-agentcore:InvokeGateway"]
    resources = ["arn:aws:bedrock-agentcore:${local.region}:${local.account_id}:gateway/*"]
  }

  statement {
    sid       = "InvokeWebSearch"
    effect    = "Allow"
    actions   = ["bedrock-agentcore:InvokeWebSearch"]
    resources = ["arn:aws:bedrock-agentcore:${local.region}:aws:tool/web-search.v1"]
  }
}

resource "aws_iam_role_policy" "gateway" {
  name   = "web-search"
  role   = aws_iam_role.gateway.id
  policy = data.aws_iam_policy_document.gateway.json
}

# AWS_IAM inbound auth needs no authorizer_configuration block — that is only
# required for CUSTOM_JWT. Callers are authorized purely by IAM
# (bedrock-agentcore:InvokeGateway scoped to this gateway in iam.tf).
resource "aws_bedrockagentcore_gateway" "this" {
  name            = var.name_prefix
  role_arn        = aws_iam_role.gateway.arn
  protocol_type   = "MCP"
  authorizer_type = "AWS_IAM"

  depends_on = [aws_iam_role_policy.gateway]
}
