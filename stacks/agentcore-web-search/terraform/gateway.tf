# --- Gateway service role -----------------------------------------------------
# The role the Gateway assumes to reach the AWS-managed Web Search backend.
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

# --- Gateway ------------------------------------------------------------------

resource "aws_bedrockagentcore_gateway" "this" {
  name            = var.name_prefix
  role_arn        = aws_iam_role.gateway.arn
  protocol_type   = "MCP"
  authorizer_type = "CUSTOM_JWT"

  authorizer_configuration {
    custom_jwt_authorizer {
      discovery_url = local.cognito_discovery_url
      # client_credentials tokens carry no `aud`, so authorize by client_id.
      allowed_clients = [aws_cognito_user_pool_client.gateway.id]
    }
  }

  depends_on = [aws_iam_role_policy.gateway]
}
