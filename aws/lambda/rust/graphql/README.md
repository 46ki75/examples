# Using GraphQL with Rust on AWS Lambda

You can deploy a GraphQL API server on AWS Lambda, supporting both Lambda Function URLs and API Gateway.

## Requirements

- Cargo Lambda
- AWS CDK

## Local Testing

You can test the Lambda behavior locally.

```bash
cargo lambda watch
```

The Lambda function server will start on `localhost:9000`. This is compatible with Lambda Function URLs.

## Deployment

Before deploying, you need to build the Lambda code.

```bash
cargo lambda build --release
```

### For Function URL

```bash
cdk deploy Lambda [--profile]
```

### For API Gateway

```bash
cdk deploy APIGW [--profile]
```
