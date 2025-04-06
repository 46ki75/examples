terraform {
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }

  # When using a non-default workspace, the state path will be `<workspace_key_prefix>/<workspace_name>/<key>`
  # @see https://developer.hashicorp.com/terraform/language/backend/s3#key
  # RUN: terraform workspace show
  # RUN: terraform workspace list
  # RUN: terraform workspace select dev
  backend "s3" {
    bucket               = "shared-46ki75-examples-s3-bucket-terraform-tfstate"
    workspace_key_prefix = "github"
    key                  = "terraform.tfstate"
    region               = "ap-northeast-1"
    encrypt              = true
    use_lockfile         = true
  }
}
