variable "region" {
  description = "AWS region. The selected Availability Zones must support API Gateway VPC Links."
  type        = string
  default     = "ap-northeast-1"
}

variable "prefix" {
  description = "Resource name prefix and Cloud Map namespace label."
  type        = string
  default     = "examples-ecs-cloudmap"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,30}[a-z0-9]$", var.prefix))
    error_message = "Use 2–32 lowercase letters, numbers, or hyphens, starting with a letter and ending with a letter or number."
  }
}

variable "availability_zone_count" {
  description = "Number of AZs for private subnets, ECS placement, and VPC Link ENIs."
  type        = number
  default     = 3

  validation {
    condition     = var.availability_zone_count >= 1 && var.availability_zone_count <= 3 && floor(var.availability_zone_count) == var.availability_zone_count
    error_message = "availability_zone_count must be an integer between 1 and 3."
  }

  validation {
    condition     = var.availability_zone_count <= length(data.aws_availability_zones.available.names)
    error_message = "The region must have at least availability_zone_count available standard AZs."
  }
}

variable "task_count" {
  description = "Caddy task count; null runs one task per selected AZ."
  type        = number
  default     = null

  validation {
    condition     = var.task_count == null ? true : var.task_count >= var.availability_zone_count && var.task_count <= 10 && floor(var.task_count) == var.task_count
    error_message = "task_count must be null or an integer between availability_zone_count and 10."
  }
}

variable "caddy_image" {
  description = "Official Alpine Caddy image supporting ARM64, /bin/sh, and wget."
  type        = string
  default     = "public.ecr.aws/docker/library/caddy:2.11.4-alpine@sha256:de23def33b17fb5d1290b0f6c2add1d70780e52341896c00a4c8a2a2fe9d355e"
}
