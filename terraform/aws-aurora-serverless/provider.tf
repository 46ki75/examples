terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.76"
    }
  }

  backend "s3" {
    bucket       = "shared-46ki75-examples-s3-bucket-terraform-tfstate"
    key          = "aws-aurora-serverless/terraform.tfstate"
    region       = "ap-northeast-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = "ap-northeast-1"
}
