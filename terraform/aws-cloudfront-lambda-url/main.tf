data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

// # --------------------------------------------------------------------------------
//
// Lambda Functions
//
// # --------------------------------------------------------------------------------

data "archive_file" "lambda" {
  type        = "zip"
  source_file = "../../target/lambda/rust-lambda-graphql/bootstrap"
  output_path = "bootstrap.zip"
}

data "aws_iam_policy_document" "assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "iam_for_lambda" {
  name               = "iam_for_lambda"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

resource "aws_lambda_function" "gql" {
  function_name = "aws-cloudfront-lambda-url"
  filename      = "bootstrap.zip"
  role          = aws_iam_role.iam_for_lambda.arn
  runtime       = "provided.al2023"
  handler       = "does.not.matter"
}

resource "aws_lambda_function_url" "gql" {
  function_name      = aws_lambda_function.gql.function_name
  authorization_type = "NONE"
}

// # --------------------------------------------------------------------------------
//
// CloudFront
//
// # --------------------------------------------------------------------------------

resource "aws_cloudfront_distribution" "lambda_url" {
  enabled = true

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  default_cache_behavior {
    allowed_methods        = ["HEAD", "DELETE", "POST", "GET", "OPTIONS", "PUT", "PATCH"]
    cached_methods         = ["HEAD", "GET"]
    viewer_protocol_policy = "redirect-to-https"
    target_origin_id       = "lambda-url-root"

    default_ttl = 0
    min_ttl     = 0
    max_ttl     = 0

    forwarded_values {
      query_string = true
      cookies {
        forward = "all"
      }
    }
  }

  origin {
    domain_name = regex("https?://([^/]+)", aws_lambda_function_url.gql.function_url)[0]
    origin_id   = "lambda-url-root"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }
}
