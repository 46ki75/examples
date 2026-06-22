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

  # The model credential for the active auth mode (the OpenRouter API key, or the
  # Claude Code subscription OAuth token) lives in this SSM SecureString.
  statement {
    sid       = "ReadModelSecret"
    effect    = "Allow"
    actions   = ["ssm:GetParameter"]
    resources = ["arn:aws:ssm:${local.model_secret_region}:${local.account_id}:parameter${local.model_secret_param}"]
  }

  # That parameter is a SecureString. Decrypting it needs kms:Decrypt on the key
  # that encrypted it (the AWS-managed `alias/aws/ssm` key by default). Scope the
  # grant to calls made through SSM in the key's region rather than naming a
  # specific key ARN.
  statement {
    sid       = "DecryptViaSsm"
    effect    = "Allow"
    actions   = ["kms:Decrypt"]
    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["ssm.${local.model_secret_region}.amazonaws.com"]
    }
  }

  # AgentCore Identity vends the Gateway bearer token from its token vault. The
  # runtime needs to read the OAuth2 credential provider (scoped by its workload
  # identity) and the Secrets Manager secret AgentCore created for the client
  # secret. Mirrors the policy in the AgentCore Identity getting-started guide.
  statement {
    sid    = "AccessTokenVault"
    effect = "Allow"
    actions = [
      "bedrock-agentcore:GetResourceOauth2Token",
      "secretsmanager:GetSecretValue",
    ]
    resources = [
      "arn:aws:bedrock-agentcore:${local.region}:${local.account_id}:workload-identity-directory/default",
      "arn:aws:bedrock-agentcore:${local.region}:${local.account_id}:workload-identity-directory/default/workload-identity/*",
      "arn:aws:bedrock-agentcore:${local.region}:${local.account_id}:token-vault/default",
      "arn:aws:bedrock-agentcore:${local.region}:${local.account_id}:token-vault/default/oauth2credentialprovider/${local.oauth_provider_name}",
      "arn:aws:secretsmanager:${local.region}:${local.account_id}:secret:bedrock-agentcore-identity!default/oauth2/${local.oauth_provider_name}*",
    ]
  }
}

resource "aws_iam_role_policy" "runtime" {
  name   = "runtime"
  role   = aws_iam_role.runtime.id
  policy = data.aws_iam_policy_document.runtime.json
}

# --- Agent Runtime ------------------------------------------------------------
# Serves the Claude Agent SDK orchestrator over HTTP (/invocations + /ping),
# provided by BedrockAgentCoreApp. Requires the image tag already present in ECR.

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

  lifecycle_configuration {
    idle_runtime_session_timeout = 60
  }

  environment_variables = merge(
    {
      GATEWAY_URL = aws_bedrockagentcore_gateway.this.gateway_url
      # The Cognito client_id/secret are no longer passed to the runtime; the agent
      # obtains the Gateway token from this AgentCore Identity credential provider,
      # which holds them in its token vault. Only the provider name and the scope
      # to request are needed here.
      GATEWAY_OAUTH_PROVIDER_NAME = aws_bedrockagentcore_oauth2_credential_provider.gateway.name
      COGNITO_SCOPE               = local.cognito_scope
      LLM_AUTH_MODE               = var.llm_auth_mode
      WORKER_MODEL_ID             = local.worker_model_id
      SYNTHESIZE_MODEL_ID         = local.synthesize_model_id
    },
    # The model credential itself is never passed here; the runtime reads it from
    # SSM (SecureString) at startup using the name/region for the active mode.
    var.llm_auth_mode == "subscription" ? {
      CLAUDE_CODE_OAUTH_TOKEN_PARAM  = var.claude_code_oauth_token_param
      CLAUDE_CODE_OAUTH_TOKEN_REGION = var.claude_code_oauth_token_region
      } : {
      OPENROUTER_API_KEY_PARAM  = var.openrouter_api_key_param
      OPENROUTER_API_KEY_REGION = var.openrouter_api_key_region
    }
  )

  depends_on = [aws_iam_role_policy.runtime]
}

resource "aws_bedrockagentcore_agent_runtime_endpoint" "live" {
  name             = "live"
  agent_runtime_id = aws_bedrockagentcore_agent_runtime.this.agent_runtime_id
  description      = "Primary endpoint for the web-search agent."

  # Pin the endpoint to the runtime's current version. Every code/config change
  # creates a new runtime version; without this the endpoint keeps serving the
  # version it was first created with (v1) and never picks up updates.
  agent_runtime_version = aws_bedrockagentcore_agent_runtime.this.agent_runtime_version
}
