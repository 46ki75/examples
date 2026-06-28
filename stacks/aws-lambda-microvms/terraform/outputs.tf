output "artifact_bucket" {
  description = "S3 bucket the control CLI uploads the image code artifact to."
  value       = aws_s3_bucket.artifacts.bucket
}

output "build_role_arn" {
  description = "Role Lambda assumes during create-microvm-image."
  value       = aws_iam_role.build.arn
}

output "execution_role_arn" {
  description = "Role the running MicroVM assumes (forwards app stdout to CloudWatch)."
  value       = aws_iam_role.execution.arn
}

output "base_image_arn_hint" {
  description = "Likely Lambda-managed base image ARN; verify with `aws lambda-microvms list-managed-microvm-images`."
  value       = local.base_image_arn_hint
}

output "region" {
  description = "Region the stack is deployed in."
  value       = var.region
}
