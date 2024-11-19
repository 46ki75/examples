resource "aws_vpc" "vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    "Name" = "46ki75-aws-fargate-vpc"
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.vpc.id

  tags = {
    "Name" = "46ki75-aws-fargate-igw"
  }
}

resource "aws_subnet" "ec2" {
  vpc_id            = aws_vpc.vpc.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "ap-northeast-1a"

  tags = {
    "Name" = "46ki75-aws-ec2-subnet-ec2"
  }
}

resource "aws_route_table" "fargate" {
  vpc_id = aws_vpc.vpc.id
}

resource "aws_route" "ec2_to_nat" {
  route_table_id         = aws_route_table.fargate.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.igw.id
}

resource "aws_route_table_association" "ec2" {
  subnet_id      = aws_subnet.ec2.id
  route_table_id = aws_route_table.fargate.id
}

