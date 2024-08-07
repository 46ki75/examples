# TypeScript (Node.js) on AWS Lambda with Docker

This is a CDK project for deploying a TypeScript container to an AWS Lambda function.

## Requirements

- docker.io
- Node.js
- AWS CDK

## How to Deploy

By running the following command, the container image will be built automatically (including the TypeScript compilation process within the Dockerfile). Furthermore, the image will be pushed to ECR, and the Lambda function will reference that image.

```bash
cdk deploy
```

Note: Images pushed to ECR are not automatically deleted.
