variable "region" {
  description = "Region to deploy into. Lambda MicroVMs is offered in us-east-1, us-east-2, us-west-2, ap-northeast-1, eu-west-1."
  type        = string
  default     = "us-east-1"
}

variable "name_prefix" {
  description = "Prefix applied to resource names."
  type        = string
  default     = "46ki75-aws-lambda-microvms"
}
