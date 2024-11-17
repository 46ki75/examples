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

  vpc_id            = aws_vpc.vpc.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "ap-northeast-1a"

  tags = {
    "Name" = "46ki75-aws-ec2-subnet"
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.vpc.id

  tags = {
    "Name" = "46ki75-aws-ec2-igw"
  }
}

resource "aws_route_table" "route_table" {
  vpc_id = aws_vpc.vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
}

resource "aws_route_table_association" "route_table_association" {
  subnet_id      = aws_subnet.subnet.id
  route_table_id = aws_route_table.route_table.id
}

resource "aws_instance" "instance" {
  availability_zone           = "ap-northeast-1a"
  instance_type               = "t3.micro"
  ami                         = "ami-094dc5cf74289dfbc"
  subnet_id                   = aws_subnet.subnet.id
  associate_public_ip_address = true

  user_data = <<-EOF
    #!/bin/bash
    dnf update -y
    dnf install -y amazon-ssm-agent
  EOF

  tags = {
    "Name" = "46ki75-aws-ec2-instance"
  }
}

