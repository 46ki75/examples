terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source = "hashicorp/aws"
      # aws_iam_role / aws_caller_identity only; any recent version is fine.
      version = ">= 6.22"
    }
    awscc = {
      source = "hashicorp/awscc"
      # The harness is not yet in the native hashicorp/aws provider, so it is
      # provisioned through awscc (AWS Cloud Control). awscc_bedrockagentcore_harness
      # maps AWS::BedrockAgentCore::Harness, which GA'd June 2026. Use the latest
      # awscc; bump this floor if `terraform init` reports the resource is unknown.
      version = ">= 1.60"
    }
    time = {
      source = "hashicorp/time"
      # Used to let the freshly-created execution role propagate to AgentCore
      # before CreateHarness validates it.
      version = ">= 0.9"
    }
  }
}

# The harness is GA in every AgentCore region; this example pins us-east-1.
provider "aws" {
  region = "us-east-1"
}

provider "awscc" {
  region = "us-east-1"
}
