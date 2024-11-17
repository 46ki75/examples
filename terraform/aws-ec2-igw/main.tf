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

resource "aws_iam_role" "ssm_role" {
  name = "46ki75-ssm-role"

  assume_role_policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Action" : "sts:AssumeRole",
        "Effect" : "Allow",
        "Principal" : {
          "Service" : "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_policy_attachment" "ssm_role_policy" {
  name       = "46ki75-ssm-role-policy-attachment"
  roles      = [aws_iam_role.ssm_role.name]
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ssm_instance_profile" {
  name = "46ki75-ssm-instance-profile"
  role = aws_iam_role.ssm_role.name
}

resource "aws_instance" "instance" {
  availability_zone           = "ap-northeast-1a"
  instance_type               = "t3.micro"
  ami                         = "ami-094dc5cf74289dfbc"
  subnet_id                   = aws_subnet.subnet.id
  associate_public_ip_address = true

  iam_instance_profile = aws_iam_instance_profile.ssm_instance_profile.name

  user_data = yamlencode({
    package_update : true
    package_upgrade : true
    packages : [
      "amazon-ssm-agent"
    ]
    runcmd : [
      "systemctl enable amazon-ssm-agent",
      "systemctl start amazon-ssm-agent"
    ]
    }
  )

  tags = {
    "Name" = "46ki75-aws-ec2-instance"
  }
}


