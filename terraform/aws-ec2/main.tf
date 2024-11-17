data "aws_caller_identity" "current" {}

resource "aws_vpc" "vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    "Name" = "46ki75-aws-ec2-vpc"
  }
}


resource "aws_subnet" "subnet" {
  count = 3

  vpc_id            = aws_vpc.vpc.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = "ap-northeast-1a"

  tags = {
    "Name" = "46ki75-aws-ec2-subnet-${count.index + 1}"
  }
}
