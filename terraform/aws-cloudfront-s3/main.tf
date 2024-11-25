// # --------------------------------------------------------------------------------
//
// S3
//
// # --------------------------------------------------------------------------------

resource "aws_s3_bucket" "web" {
  bucket        = "46ki75-aws-cloudfront-s3"
  force_destroy = true
}

resource "aws_s3_object" "file" {
  bucket       = aws_s3_bucket.web.bucket
  key          = "index.html"
  content      = file("./index.html")
  content_type = "text/html"
  etag         = md5(file("./index.html"))
}

resource "aws_s3_object" "error" {
  bucket       = aws_s3_bucket.web.bucket
  key          = "error.html"
  content      = file("./error.html")
  content_type = "text/html"
  etag         = md5(file("./error.html"))
}

resource "aws_s3_bucket_policy" "web" {
  bucket = aws_s3_bucket.web.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.web.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = "${aws_cloudfront_distribution.web.arn}"
          }
        }
      }
    ]
  })

}

// # --------------------------------------------------------------------------------
//
// CloudFront
//
// # --------------------------------------------------------------------------------


resource "aws_cloudfront_origin_access_control" "web" {
  name                              = "web"
  description                       = "Example Policy"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "web" {
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
    target_origin_id       = "s3"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  origin {
    domain_name              = aws_s3_bucket.web.bucket_regional_domain_name
    origin_id                = "s3"
    origin_access_control_id = aws_cloudfront_origin_access_control.web.id
  }

  default_root_object = "index.html"

  custom_error_response {
    error_code            = 403
    response_code         = 404
    response_page_path    = "/error.html"
    error_caching_min_ttl = 0
  }
}
