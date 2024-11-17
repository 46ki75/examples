data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "my_bucket" {
  bucket = "${data.aws_caller_identity.current.account_id}-46ki75-com-spec"
}
