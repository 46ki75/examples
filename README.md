# Examples Repository

This repository contains a diverse collection of project examples implemented in various programming languages and frameworks. Each sub-project demonstrates different architectures, deployment targets, and integrations with AWS and other cloud services.

## Repository Structure

- `crates/{project_name}/`: Rust projects
- `java/{project_name}/`: JVM family projects (Java, Kotlin, Scala)
- `others/{project_name}/`: Other languages or configuration-only projects
- `packages/{project_name}/`: TypeScript projects
- `pulumi/{project_name}/`: Pulumi infrastructure projects
- `python/{project_name}/`: Python projects
- `terraform/{project_name}/`: Terraform infrastructure modules

---

## Rust Projects (`crates/`)

### rust-aoss

**Location**: `crates/rust-aoss`  
**Language**: Rust  
**Framework/Platform**: AWS SDK, Tokio  
**Purpose**: Example of integrating with AWS OpenSearch using Rust, including authentication and search operations.  
**Key Technologies**: aws-config, opensearch, serde, tokio  
**Usage**: Configure environment and run with Cargo.  
**Notes**: Uses dotenvy for environment management.

### rust-lambda-http

**Location**: `crates/rust-lambda-http`  
**Language**: Rust  
**Framework/Platform**: AWS Lambda, Cargo Lambda  
**Purpose**: Demonstrates running a GraphQL API on AWS Lambda using Rust.  
**Key Technologies**: Cargo Lambda, AWS Lambda, GraphQL  
**Usage**: `cargo lambda watch` to run locally; access via local endpoint.  
**Notes**: See README for details.

### rust-lambda-stream

**Location**: `crates/rust-lambda-stream`  
**Language**: Rust  
**Framework/Platform**: AWS Lambda  
**Purpose**: Example of streaming responses from AWS Lambda in Rust.  
**Key Technologies**: AWS Lambda  
**Usage**: Access via local endpoint for stream demo.  
**Notes**: Minimal documentation.

### rust-mcp

**Location**: `crates/rust-mcp`  
**Language**: Rust  
**Framework/Platform**: Custom MCP server  
**Purpose**: Example MCP server implementation in Rust.  
**Key Technologies**: Custom server logic  
**Usage**: Run the server binary as described in README.  
**Notes**: Includes JSON server configuration.

---

## Java Projects (`java/`)

### aws/lambda-java

**Location**: `java/aws/lambda-java`  
**Language**: Java  
**Framework/Platform**: AWS Lambda  
**Purpose**: Example of deploying and running Java functions on AWS Lambda.  
**Key Technologies**: Gradle, Java 21  
**Usage**: Build with Gradle, deploy jar, invoke locally.  
**Notes**: Handler: `example.handler.Handler::handleRequest`.

---

## Other Projects (`others/`)

### open-webui-bedrock-local

**Location**: `others/open-webui-bedrock-local`  
**Language**: Docker Compose, YAML  
**Framework/Platform**: Open WebUI, LiteLLM, Amazon Bedrock  
**Purpose**: Local deployment of Open WebUI with Amazon Bedrock integration via LiteLLM.  
**Key Technologies**: Docker Compose, LiteLLM, Open WebUI  
**Usage**: `docker-compose up` to start services; configure LLM settings in UI.  
**Notes**: See README for screenshots and setup steps.

---

## TypeScript Projects (`packages/`)

### cdk

**Location**: `packages/cdk`  
**Language**: TypeScript  
**Framework/Platform**: AWS CDK  
**Purpose**: Blank AWS CDK project for infrastructure development.  
**Key Technologies**: AWS CDK, Jest  
**Usage**: Build, test, and deploy using npm/CDK commands.  
**Notes**: See README for command list.

### node-lambda-graphql

**Location**: `packages/node-lambda-graphql`  
**Language**: TypeScript  
**Framework/Platform**: AWS Lambda, GraphQL  
**Purpose**: GraphQL API implementation for AWS Lambda.  
**Key Technologies**: graphql, @graphql-tools, esbuild  
**Usage**: Build with `tsx build.ts`.  
**Notes**: See package.json for dependencies.

### node-lambda-nitro-stream

**Location**: `packages/node-lambda-nitro-stream`  
**Language**: TypeScript  
**Framework/Platform**: Nitro  
**Purpose**: Starter project for Nitro server with streaming endpoint.  
**Key Technologies**: Nitro  
**Usage**: See README for quick start and curl example.  
**Notes**: Minimal documentation.

### node-lambda-playwright

**Location**: `packages/node-lambda-playwright`  
**Language**: TypeScript  
**Framework/Platform**: AWS Lambda, Playwright  
**Purpose**: Example of using Playwright in AWS Lambda.  
**Key Technologies**: Playwright  
**Usage**: See Dockerfile and source for details.  
**Notes**: README missing.

### node-lambda-template

**Location**: `packages/node-lambda-template`  
**Language**: TypeScript  
**Framework/Platform**: AWS Lambda, Docker, AWS SAM  
**Purpose**: Template for deploying Lambda functions as containers or zip archives.  
**Key Technologies**: Docker, AWS SAM  
**Usage**: Build Docker image, run locally, deploy with SAM.  
**Notes**: See README for step-by-step instructions.

### node-langchain

**Location**: `packages/node-langchain`  
**Language**: TypeScript  
**Framework/Platform**: LangChain  
**Purpose**: Example project using LangChain for language model workflows.  
**Key Technologies**: @langchain/core, @langchain/community  
**Usage**: Build and start with npm scripts.  
**Notes**: See package.json for details.

### node-mcp-mermaid

**Location**: `packages/node-mcp-mermaid`  
**Language**: TypeScript  
**Framework/Platform**: Custom  
**Purpose**: Example project for Mermaid diagram generation.  
**Key Technologies**: Mermaid  
**Usage**: See source directory.  
**Notes**: No README.

---

## Pulumi Projects (`pulumi/`)

### pulumi/aws-cloudfront-s3

**Location**: `pulumi/aws-cloudfront-s3`  
**Language**: Go  
**Framework/Platform**: Pulumi, AWS CloudFront, S3  
**Purpose**: Static hosting using Amazon CloudFront and S3 via Pulumi.  
**Key Technologies**: Pulumi, AWS  
**Usage**: Configure and deploy with Pulumi CLI.  
**Notes**: See Pulumi.yaml for details.

### aws-ec2-public

**Location**: `pulumi/aws-ec2-public`  
**Language**: Go  
**Framework/Platform**: Pulumi, AWS EC2  
**Purpose**: Minimal AWS EC2 deployment using Pulumi.  
**Key Technologies**: Pulumi, AWS  
**Usage**: Configure and deploy with Pulumi CLI.  
**Notes**: See Pulumi.yaml for details.

---

## Python Projects (`python/`)

### ansible-packer-molecule

**Location**: `python/ansible-packer-molecule`  
**Language**: Python, YAML  
**Framework/Platform**: Ansible, Packer, Molecule  
**Purpose**: Infrastructure automation and testing with Ansible, Packer, and Molecule.  
**Key Technologies**: Ansible, Packer, Molecule, AWS CLI  
**Usage**: Install dependencies, run playbooks, test with Molecule.  
**Notes**: Manual S3 bucket setup required.

### python-lambda-adapter

**Location**: `python/python-lambda-adapter`  
**Language**: Python  
**Framework/Platform**: AWS Lambda, ASGI, uvicorn  
**Purpose**: Example of using aws-lambda-web-adapter with Python ASGI apps.  
**Key Technologies**: aws-lambda-web-adapter, uvicorn  
**Usage**: Start with uvicorn; adapter proxies requests.  
**Notes**: See README for details.

### python-lambda-fastapi

**Location**: `python/python-lambda-fastapi`  
**Language**: Python  
**Framework/Platform**: FastAPI, AWS Lambda  
**Purpose**: FastAPI application for AWS Lambda deployment.  
**Key Technologies**: FastAPI, uvicorn  
**Usage**: Run locally with uv, bundle for Lambda with build script.  
**Notes**: See README for commands.

### python-langchain

**Location**: `python/python-langchain`  
**Language**: Python  
**Framework/Platform**: LangChain  
**Purpose**: Example project using LangChain for language model workflows.  
**Key Technologies**: LangChain  
**Usage**: See source directory.  
**Notes**: README missing.

### python-strands-agents

**Location**: `python/python-strands-agents`  
**Language**: Python  
**Framework/Platform**: Custom  
**Purpose**: Example agent-based workflows in Python.  
**Key Technologies**: Custom  
**Usage**: See source directory.  
**Notes**: README missing.

### python_module

**Location**: `python/python_module`  
**Language**: Python  
**Framework/Platform**: Custom  
**Purpose**: Example Python module structure.  
**Key Technologies**: Custom  
**Usage**: See source directory.  
**Notes**: README missing.

---

## Terraform Projects (`terraform/`)

### aws-aurora-serverless

**Location**: `terraform/aws-aurora-serverless`  
**Language**: HCL  
**Framework/Platform**: AWS Aurora, Terraform  
**Purpose**: Deploys an Aurora PostgreSQL serverless cluster.  
**Key Technologies**: Terraform, AWS RDS  
**Usage**: Apply with Terraform CLI.  
**Notes**: See main.tf for resource details.

### aws-cloudfront-lambda-url

**Location**: `terraform/aws-cloudfront-lambda-url`  
**Language**: HCL  
**Framework/Platform**: AWS Lambda, CloudFront, Terraform  
**Purpose**: Deploys Lambda function and integrates with CloudFront.  
**Key Technologies**: Terraform, AWS Lambda  
**Usage**: Apply with Terraform CLI.  
**Notes**: See main.tf for resource details.

### terraform/aws-cloudfront-s3

**Location**: `terraform/aws-cloudfront-s3`  
**Language**: HCL  
**Framework/Platform**: AWS S3, CloudFront, Terraform  
**Purpose**: Static website hosting using S3 and CloudFront.  
**Key Technologies**: Terraform, AWS S3, CloudFront  
**Usage**: Apply with Terraform CLI.  
**Notes**: See main.tf for resource details.

### aws-ec2-igw

**Location**: `terraform/aws-ec2-igw`  
**Language**: HCL  
**Framework/Platform**: AWS EC2, Terraform  
**Purpose**: Deploys EC2 instance with SSM and security group.  
**Key Technologies**: Terraform, AWS EC2, SSM  
**Usage**: Apply with Terraform CLI.  
**Notes**: See main.tf for resource details.

### aws-ec2-iso

**Location**: `terraform/aws-ec2-iso`  
**Language**: HCL  
**Framework/Platform**: AWS EC2, Terraform  
**Purpose**: Deploys EC2 instance with ISO configuration.  
**Key Technologies**: Terraform, AWS EC2  
**Usage**: Apply with Terraform CLI.  
**Notes**: See main.tf for resource details.

### aws-ec2-nat

**Location**: `terraform/aws-ec2-nat`  
**Language**: HCL  
**Framework/Platform**: AWS EC2, NAT, Terraform  
**Purpose**: Deploys EC2 instance with NAT configuration.  
**Key Technologies**: Terraform, AWS EC2, NAT  
**Usage**: Apply with Terraform CLI.  
**Notes**: See main.tf for resource details.

### aws-fargate

**Location**: `terraform/aws-fargate`  
**Language**: HCL  
**Framework/Platform**: AWS Fargate, ECS, Terraform  
**Purpose**: Deploys Fargate ECS cluster and related resources.  
**Key Technologies**: Terraform, AWS Fargate, ECS  
**Usage**: Apply with Terraform CLI.  
**Notes**: See main.tf for resource details.

### aws-idp-github

**Location**: `terraform/aws-idp-github`  
**Language**: HCL  
**Framework/Platform**: AWS IAM, GitHub OIDC, Terraform  
**Purpose**: Sets up IAM roles and policies for GitHub Actions OIDC integration.  
**Key Technologies**: Terraform, AWS IAM, GitHub Actions  
**Usage**: Apply with Terraform CLI.  
**Notes**: See main.tf for resource details.

---

This README provides a comprehensive overview of all sub-projects in the repository. For details and usage instructions, refer to each project's README or configuration files.
