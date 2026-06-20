# --- Runtime execution role ---------------------------------------------------
# The role the AgentCore Runtime assumes to pull the image, write logs, mint a
# workload identity token, and call Bedrock for model inference.

data "aws_iam_policy_document" "runtime_assume" {
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
      values   = ["arn:aws:bedrock-agentcore:${local.region}:${local.account_id}:*"]
    }
  }
}

resource "aws_iam_role" "runtime" {
  name               = "${var.name_prefix}-runtime-role"
  assume_role_policy = data.aws_iam_policy_document.runtime_assume.json
}

data "aws_iam_policy_document" "runtime" {
  statement {
    sid       = "EcrAuth"
    effect    = "Allow"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid       = "EcrPull"
    effect    = "Allow"
    actions   = ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer"]
    resources = [aws_ecr_repository.agent.arn]
  }

  statement {
    sid    = "Logs"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogStreams",
    ]
    resources = ["arn:aws:logs:${local.region}:${local.account_id}:log-group:/aws/bedrock-agentcore/*"]
  }

  statement {
    sid    = "WorkloadIdentity"
    effect = "Allow"
    actions = [
      "bedrock-agentcore:GetWorkloadAccessToken",
      "bedrock-agentcore:GetWorkloadAccessTokenForJWT",
      "bedrock-agentcore:GetWorkloadAccessTokenForUserId",
    ]
    resources = [
      "arn:aws:bedrock-agentcore:${local.region}:${local.account_id}:workload-identity-directory/default",
      "arn:aws:bedrock-agentcore:${local.region}:${local.account_id}:workload-identity-directory/default/workload-identity/*",
    ]
  }

  statement {
    sid     = "InvokeModel"
    effect  = "Allow"
    actions = ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"]
    resources = [
      "arn:aws:bedrock:*::foundation-model/*",
      "arn:aws:bedrock:${local.region}:${local.account_id}:inference-profile/*",
    ]
  }
}

resource "aws_iam_role_policy" "runtime" {
  name   = "runtime"
  role   = aws_iam_role.runtime.id
  policy = data.aws_iam_policy_document.runtime.json
}

# --- Agent Runtime ------------------------------------------------------------
# Serves the Strands orchestrator over HTTP (/invocations + /ping), provided by
# BedrockAgentCoreApp. Requires the image tag to already be present in ECR.

resource "aws_bedrockagentcore_agent_runtime" "this" {
  agent_runtime_name = "agentcore_web_search"
  role_arn           = aws_iam_role.runtime.arn

  agent_runtime_artifact {
    container_configuration {
      container_uri = "${aws_ecr_repository.agent.repository_url}:${var.image_tag}"
    }
  }

  network_configuration {
    network_mode = "PUBLIC"
  }

  protocol_configuration {
    server_protocol = "HTTP"
  }

  environment_variables = {
    GATEWAY_URL       = aws_bedrockagentcore_gateway.this.gateway_url
    COGNITO_TOKEN_URL = local.cognito_token_url
    COGNITO_CLIENT_ID = aws_cognito_user_pool_client.gateway.id
    # For example simplicity the M2M secret rides in plain env vars. In
    # production, store it in Secrets Manager and grant the runtime role read
    # access instead.
    COGNITO_CLIENT_SECRET = aws_cognito_user_pool_client.gateway.client_secret
    COGNITO_SCOPE         = local.cognito_scope
    BEDROCK_MODEL_ID      = var.bedrock_model_id
  }

  depends_on = [aws_iam_role_policy.runtime]
}

resource "aws_bedrockagentcore_agent_runtime_endpoint" "live" {
  name             = "live"
  agent_runtime_id = aws_bedrockagentcore_agent_runtime.this.agent_runtime_id
  description      = "Primary endpoint for the web-search agent."
}
