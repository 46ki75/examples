resource "aws_s3_bucket" "static" {
  bucket        = "46ki75-aws-cloudfront-s3"
  force_destroy = true
}


resource "aws_s3_object" "file" {
  bucket  = aws_s3_bucket.static.bucket
  key     = "index.html"
  content = file("./index.html")
}
