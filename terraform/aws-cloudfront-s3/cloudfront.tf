resource "aws_cloudfront_cache_policy" "s3" {
  name = "${terraform.workspace}-46ki75-examples-cloudfront-cache_policy-s3"

  default_ttl = 3600 * 24 * 30 * 6  # 6  [Month]
  min_ttl     = 3600 * 24 * 30 * 1  # 1  [Month]
  max_ttl     = 3600 * 24 * 30 * 12 # 12 [Month]

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }

    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

resource "aws_cloudfront_cache_policy" "disabled" {
  name = "${terraform.workspace}-46ki75-examples-cloudfront-cache_policy-disabled"

  default_ttl = 0
  min_ttl     = 0
  max_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

resource "aws_cloudfront_origin_request_policy" "all_viewer" {

  name = "${terraform.workspace}-46ki75-examples-cloudfront-origin_request_policy-all_viewer"

  cookies_config {
    cookie_behavior = "all"
  }
  headers_config {
    header_behavior = "allExcept"
    headers {
      items = ["Host"]
    }
  }
  query_strings_config {
    query_string_behavior = "all"
  }
}

resource "aws_cloudfront_response_headers_policy" "default" {

  name = "${terraform.workspace}-46ki75-examples-cloudfront-response_headers_policy-web"

  security_headers_config {

    strict_transport_security {
      override                   = true
      access_control_max_age_sec = 31536000
      include_subdomains         = true
    }

    content_type_options {
      override = true
    }

    frame_options {
      override     = true
      frame_option = "SAMEORIGIN"
    }

    xss_protection {
      override   = true
      mode_block = true
      protection = true
    }

    referrer_policy {
      override        = true
      referrer_policy = "no-referrer"
    }
  }
}

resource "aws_cloudfront_origin_access_control" "web" {
  name                              = "web"
  description                       = "Example Policy"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "web" {
  tags = {
    "name" = "46ki75-${local.stage_name}-aws-cloudfront-distribution-web"
  }

  comment             = "46ki75-${local.stage_name}-aws-cloudfront-distribution-web"
  enabled             = true
  staging             = false
  is_ipv6_enabled     = true
  http_version        = "http2and3"
  default_root_object = "index.html"
  web_acl_id          = aws_wafv2_web_acl.web.arn

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  default_cache_behavior {
    allowed_methods = [
      "DELETE",
      "GET",
      "HEAD",
      "OPTIONS",
      "PATCH",
      "POST",
      "PUT"
    ]
    cached_methods         = ["GET", "HEAD"]
    viewer_protocol_policy = "redirect-to-https"
    target_origin_id       = "s3-root"

    default_ttl = 3600 * 24 * 30
    min_ttl     = 0
    max_ttl     = 3600 * 24 * 30 * 12

    compress = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
      headers = ["etag"]
    }
  }

  ordered_cache_behavior {
    path_pattern = "/api/*"
    allowed_methods = [
      "DELETE",
      "GET",
      "HEAD",
      "OPTIONS",
      "PATCH",
      "POST",
      "PUT"
    ]
    cached_methods         = ["GET", "HEAD"]
    viewer_protocol_policy = "redirect-to-https"
    target_origin_id       = "lambda-api"

    default_ttl = 3600 * 24 * 30
    min_ttl     = 0
    max_ttl     = 3600 * 24 * 30 * 12

    cache_policy_id            = aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.all_viewer.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.default.id

    compress = true
  }

  origin {
    domain_name              = aws_s3_bucket.web.bucket_regional_domain_name
    origin_id                = "s3-root"
    origin_access_control_id = aws_cloudfront_origin_access_control.web.id
  }

  origin {
    domain_name = regex("https?://([^/]+)", aws_lambda_function_url.api.function_url)[0]
    origin_id   = "lambda-api"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  custom_error_response {
    error_code            = 403
    response_code         = 404
    response_page_path    = "/error.html"
    error_caching_min_ttl = 0
  }
}
