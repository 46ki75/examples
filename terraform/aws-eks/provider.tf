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
