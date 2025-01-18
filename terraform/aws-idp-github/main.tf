data "aws_region" "current" {}
data "aws_caller_identity" "current" {}


resource "aws_iam_openid_connect_provider" "name" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = []
}
