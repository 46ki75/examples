variable "ami_id" {
  type = string
  default = "ami-07faa35bbd2230d90"
}

data "amazon-parameterstore" "vpc_id" {
  name = "/AnsiblePacker/vpc-id"
  with_decryption = false
}

data "amazon-parameterstore" "subnet_id" {
  name = "/AnsiblePacker/private-subnet-id"
  with_decryption = false
}

data "amazon-parameterstore" "security_group_id" {
  name = "/AnsiblePacker/security-group-id"
  with_decryption = false
}

packer {
  required_plugins {
    amazon = {
      version = ">= 1.4.0"
      source = "github.com/hashicorp/amazon"
    }
    ansible = {
      version = ">= 1.1.4"
      source = "github.com/hashicorp/ansible"
    }
  }
}

source "amazon-ebs" "example" {
  instance_type = "t3.small"
  region = "ap-northeast-1"

  vpc_id = data.amazon-parameterstore.vpc_id.value
  subnet_id = data.amazon-parameterstore.subnet_id.value
  security_group_id = data.amazon-parameterstore.security_group_id.value
  source_ami = var.ami_id

  ssh_username = "ec2-user"
  ssh_interface = "session_manager"
  iam_instance_profile = "AnsiblePackerInstanceProfile"

  launch_block_device_mappings {
    device_name = "/dev/xvda"
    volume_size = 30
    volume_type = "gp3"
    delete_on_termination = true
    encrypted = true
    kms_key_id = "alias/aws/ebs"
  }
}

build {
  name = "ec2-instance-web"
  sources = ["source.amazon-ebs.example"]

  source "amazon-ebs.example" {
    ami_name = "packer-ansible-web-{{timestamp}}"
  }

  provisioner "ansible" {
    command = "./.venv/bin/ansible-playbook"
    host_alias = "ec2-instance-web"
    playbook_file = "./site.yml"
  }
}

build {
  name = "ec2-instance-api"
  sources = ["source.amazon-ebs.example"]

  source "amazon-ebs.example" {
    ami_name = "packer-ansible-api-{{timestamp}}"
  }

  provisioner "ansible" {
    command = "./.venv/bin/ansible-playbook"
    host_alias = "ec2-instance-api"
    playbook_file = "./site.yml"
  }
}

build {
  name = "ec2-instance-batch"
  sources = ["source.amazon-ebs.example"]

  source "amazon-ebs.example" {
    ami_name = "packer-ansible-batch-{{timestamp}}"
  }

  provisioner "ansible" {
    command = "./.venv/bin/ansible-playbook"
    host_alias = "ec2-instance-batch"
    playbook_file = "./site.yml"
  }
}