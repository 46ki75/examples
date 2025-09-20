variable "ami_id" {
  type =  string
  default = "ami-07faa35bbd2230d90"
}

variable "vpc_id" {
  type =  string
}

variable "subnet_id" {
  type =  string
}

variable "security_group_id" {
  type =  string
}

packer {
  required_plugins {
    amazon = {
      version = ">= 1.4.0"
      source  = "github.com/hashicorp/amazon"
    }
    ansible = {
      version = ">= 1.1.4"
      source = "github.com/hashicorp/ansible"
    }
  }
}

source "amazon-ebs" "example" {
  ami_name      = "packer-ansible-example-{{timestamp}}"
  instance_type = "t3.small"
  region        = "ap-northeast-1"

  vpc_id        = var.vpc_id
  subnet_id     = var.subnet_id
  security_group_id = var.security_group_id
  source_ami = var.ami_id

  ssh_username  = "ec2-user"
  ssh_interface = "session_manager"
  iam_instance_profile = "AnsiblePackerInstanceProfile"

  
  launch_block_device_mappings  {
    device_name = "/dev/xvda"
    volume_size = 30
    volume_type = "gp3"
    delete_on_termination = true
    encrypted = true
    kms_key_id = "alias/aws/ebs"
  }
}

build {
  sources = ["source.amazon-ebs.example"]

  provisioner "ansible" {
    command = "./.venv/bin/ansible-playbook"
    host_alias = "ec2-instance-web"
    playbook_file = "./site.yml"
  }
}