data "aws_caller_identity" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id

  # Bucket Lambda reads the code artifact (the zipped Dockerfile + src) from.
  artifact_bucket = "${var.name_prefix}-artifacts-${local.account_id}"

  # The Lambda-managed MicroVM base image (OS + service components). Treated as a
  # hint output only: the exact suffix can change, so the control CLI lets you
  # override it. Discover the live list with:
  #   aws lambda-microvms list-managed-microvm-images --region <region>
  base_image_arn_hint = "arn:aws:lambda:${var.region}:aws:microvm-image:al2023-1"
}
