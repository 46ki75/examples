variable "region" {
  description = "AWS region containing the stack and optional ACM certificate."
  type        = string
  default     = "ap-northeast-1"
}

variable "prefix" {
  description = "Resource name prefix; leaves room for ALB target-group suffixes."
  type        = string
  default     = "examples-ecs-alb"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,22}[a-z0-9]$", var.prefix))
    error_message = "Use 2–24 lowercase letters, numbers, or hyphens, starting with a letter and ending with a letter or number."
  }
}

variable "availability_zone_count" {
  description = "Number of public/private subnet pairs and zonal NAT gateways."
  type        = number
  default     = 3

  validation {
    condition     = contains([2, 3], var.availability_zone_count)
    error_message = "availability_zone_count must be 2 or 3; an ALB requires at least two AZs."
  }

  validation {
    condition     = var.availability_zone_count <= length(data.aws_availability_zones.available.names)
    error_message = "The region must have enough available standard Availability Zones."
  }
}

variable "task_count" {
  description = "Steady-state task count; null runs one task per selected AZ."
  type        = number
  default     = null

  validation {
    condition     = var.task_count == null ? true : var.task_count >= var.availability_zone_count && var.task_count <= 10 && floor(var.task_count) == var.task_count
    error_message = "task_count must be null or an integer between availability_zone_count and 10."
  }
}

variable "caddy_image" {
  description = "Digest-pinned ARM64 Alpine Caddy image with /bin/sh and wget."
  type        = string
  default     = "public.ecr.aws/docker/library/caddy:2.11.4-alpine@sha256:de23def33b17fb5d1290b0f6c2add1d70780e52341896c00a4c8a2a2fe9d355e"

  validation {
    condition     = can(regex("@sha256:[0-9a-f]{64}$", var.caddy_image))
    error_message = "Pin caddy_image to an immutable sha256 digest."
  }
}

variable "release" {
  description = "Demo release identifier; changing it creates a new task revision."
  type        = string
  default     = "v1"

  validation {
    condition     = can(regex("^[A-Za-z0-9._-]{1,64}$", var.release))
    error_message = "release must contain 1–64 letters, numbers, dots, underscores, or hyphens."
  }
}

variable "bake_time_in_minutes" {
  description = "Time to retain the old revision after production cutover."
  type        = number
  default     = 5

  validation {
    condition     = var.bake_time_in_minutes >= 1 && var.bake_time_in_minutes <= 30 && floor(var.bake_time_in_minutes) == var.bake_time_in_minutes
    error_message = "Use an integer between 1 and 30 minutes, within this example's Terraform wait timeout."
  }
}

variable "client_cidrs" {
  description = "IPv4 CIDRs allowed to reach production; the demo is public by default."
  type        = set(string)
  default     = ["0.0.0.0/0"]

  validation {
    condition     = length(var.client_cidrs) > 0 && alltrue([for cidr in var.client_cidrs : can(cidrnetmask(cidr))])
    error_message = "Provide at least one valid IPv4 CIDR for production clients."
  }
}

variable "test_client_cidrs" {
  description = "IPv4 CIDRs allowed on test port 8081; empty disables test ingress."
  type        = set(string)
  default     = []

  validation {
    condition     = alltrue([for cidr in var.test_client_cidrs : try(cidrnetmask(cidr) != "0.0.0.0", false)])
    error_message = "Use explicit IPv4 tester/egress CIDRs, not 0.0.0.0/0."
  }
}

variable "certificate_arn" {
  description = "Existing ACM certificate ARN in this region; null enables HTTP demo mode."
  type        = string
  default     = null

  validation {
    condition     = var.certificate_arn == null ? true : can(regex("^arn:[^:]+:acm:${var.region}:[0-9]{12}:certificate/[A-Za-z0-9-]+$", var.certificate_arn))
    error_message = "Use an ACM certificate ARN in the configured region."
  }
}

variable "domain_name" {
  description = "DNS name covered by the certificate; create its ALIAS/CNAME separately."
  type        = string
  default     = null

  validation {
    condition     = (var.certificate_arn == null) == (var.domain_name == null)
    error_message = "Set certificate_arn and domain_name together, or leave both null for HTTP."
  }

  validation {
    condition     = var.domain_name == null ? true : can(regex("^[A-Za-z0-9][A-Za-z0-9.-]*[.][A-Za-z]{2,}$", var.domain_name))
    error_message = "domain_name must be a DNS hostname, without a scheme, port, or path."
  }
}

variable "validation_hook_arn" {
  description = "Optional existing Lambda ARN for POST_TEST_TRAFFIC_SHIFT validation."
  type        = string
  default     = null

  validation {
    condition     = var.validation_hook_arn == null ? true : can(regex("^arn:[^:]+:lambda:${var.region}:[0-9]{12}:function:[A-Za-z0-9_-]+(:[A-Za-z0-9_-]+)?$", var.validation_hook_arn))
    error_message = "Use a Lambda function ARN (optionally qualified) in the configured region."
  }
}
