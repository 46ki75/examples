terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.76"
    }
  }
}

provider "aws" {
  region = "ap-northeast-1"
}

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "my_bucket" {
  bucket = "${data.aws_caller_identity.current.account_id}-46ki75-com-spec"
}
