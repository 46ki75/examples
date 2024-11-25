resource "aws_s3_bucket" "static" {
  bucket        = "46ki75-aws-cloudfront-s3"
  force_destroy = true
}

resource "aws_s3_object" "file" {
  bucket  = aws_s3_bucket.static.bucket
  key     = "index.html"
  content = file("./index.html")
}

# https://registry.terraform.io/providers/hashicorp/aws/5.70.0/docs/resources/s3_bucket_website_configuration
resource "aws_s3_bucket_website_configuration" "name" {
  bucket = aws_s3_bucket.static.bucket

  index_document {
    suffix = "index.html"
  }
}
