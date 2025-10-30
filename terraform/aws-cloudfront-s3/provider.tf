terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.4"
    }
  }
}

provider "aws" {
  region = "ap-northeast-1"
}

provider "aws" {
  region = "us-east-1"
  alias  = "us-east-1"
}
