#!/bin/bash

set -u -e -o pipefail

STACK_NAME="AnsiblePacker"
TEMPLATE_FILE_PATH="template-packer.yml"

aws cloudformation deploy \
    --stack-name "${STACK_NAME}" \
    --template-file "${TEMPLATE_FILE_PATH}" \
    --capabilities CAPABILITY_NAMED_IAM

outputs=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --query "Stacks[0].Outputs" \
    --output json)

VPC_ID=$(echo "${outputs}" | jq -r '.[] | select(.OutputKey=="VPCId") | .OutputValue')
PUBLIC_SUBNET_ID=$(echo "${outputs}" | jq -r '.[] | select(.OutputKey=="PublicSubnetId") | .OutputValue')
PRIVATE_SUBNET_ID=$(echo "${outputs}" | jq -r '.[] | select(.OutputKey=="PrivateSubnetId") | .OutputValue')
SECURITY_GROUP_ID=$(echo "${outputs}" | jq -r '.[] | select(.OutputKey=="SecurityGroupId") | .OutputValue')

packer init .

# @see https://developer.hashicorp.com/packer/guides/hcl/variables#assigning-variables
packer build \
  -var "vpc_id=${VPC_ID}" \
  -var "subnet_id=${PRIVATE_SUBNET_ID}" \
  -var "security_group_id=${SECURITY_GROUP_ID}" \
  .

aws cloudformation delete-stack \
    --stack-name "${STACK_NAME}"
