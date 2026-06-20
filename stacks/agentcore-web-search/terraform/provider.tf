terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source = "hashicorp/aws"
      # AgentCore Gateway / Agent Runtime resources require a recent provider.
      version = ">= 6.22"
    }
  }
}

# Web Search on Amazon Bedrock AgentCore is currently only offered in us-east-1,
# so the whole stack is pinned there.
provider "aws" {
  region = "us-east-1"
}
