resource "aws_cloudwatch_log_group" "api" {
  name              = "/apigateway/${var.prefix}"
  retention_in_days = 7
}

resource "aws_apigatewayv2_vpc_link" "main" {
  name               = "${var.prefix}-${var.availability_zone_count}az"
  security_group_ids = [aws_security_group.vpc_link.id]
  subnet_ids         = [for subnet in aws_subnet.private : subnet.id]

  # Subnet changes require a new link; switch the integration before deleting the old link.
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_apigatewayv2_api" "main" {
  name          = var.prefix
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "caddy" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "HTTP_PROXY"
  integration_method     = "ANY"
  integration_uri        = local.cloudmap_service.Arn
  connection_type        = "VPC_LINK"
  connection_id          = aws_apigatewayv2_vpc_link.main.id
  payload_format_version = "1.0"
  timeout_milliseconds   = 10000

  # Private integrations otherwise prepend the API stage to the backend path.
  request_parameters = {
    "overwrite:path" = "$request.path"
  }
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.caddy.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 200
    throttling_rate_limit  = 100
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api.arn
    format = jsonencode({
      requestId        = "$context.requestId"
      requestTime      = "$context.requestTime"
      httpMethod       = "$context.httpMethod"
      path             = "$context.path"
      status           = "$context.status"
      responseLength   = "$context.responseLength"
      integrationError = "$context.integrationErrorMessage"
    })
  }
}
