terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.0"
    }
  }
}

# Lambda MicroVMs launched at GA in 5 Regions: us-east-1, us-east-2, us-west-2,
# ap-northeast-1, eu-west-1. Override with `var.region`.
provider "aws" {
  region = var.region
}
