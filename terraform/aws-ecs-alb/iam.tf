resource "aws_iam_role" "execution" {
  name = "${var.prefix}-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "logs" {
  name = "caddy-logs"
  role = aws_iam_role.execution.id

  # The public image needs no private ECR credentials; Caddy calls no AWS APIs.
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
      Resource = "${aws_cloudwatch_log_group.caddy.arn}:*"
    }]
  })
}

resource "aws_iam_role" "load_balancer" {
  name = "${var.prefix}-load-balancer"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "ecs.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "load_balancer" {
  role       = aws_iam_role.load_balancer.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonECSInfrastructureRolePolicyForLoadBalancers"
}

resource "aws_iam_role" "validation" {
  count = var.validation_hook_arn == null ? 0 : 1

  name               = "${var.prefix}-validation"
  assume_role_policy = aws_iam_role.load_balancer.assume_role_policy
}

resource "aws_iam_role_policy" "validation" {
  count = var.validation_hook_arn == null ? 0 : 1

  name = "invoke-validation"
  role = aws_iam_role.validation[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["lambda:InvokeFunction"]
      Resource = var.validation_hook_arn
    }]
  })
}
