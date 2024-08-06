# cargo-lambda

A codebase for running Rust on AWS Lambda.

## Requirements

The following installations are required:

- AWS CLI
- AWS CDK
- Cargo

## Install Cargo Lambda

Cargo Lambda is a tool that simplifies the build and deployment of Rust applications on AWS. It can be installed using cargo-binstall.

[Installation Guide](https://www.cargo-lambda.info/guide/installation.html)

```bash
cargo install cargo-binstall
cargo binstall cargo-lambda
```

## Build Lambda Function

Run the following command to build the Lambda function:

```bash
cargo lambda build --release
```

## Deploy Lambda Function

Run the following command to deploy the Lambda function:

```bash
cd cargo-lambda-cdk
cdk deploy [--profile]
```

Note: Replace `[--profile]` with your specific AWS profile if needed.
