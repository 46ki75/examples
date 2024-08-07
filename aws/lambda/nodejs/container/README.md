# TypeScript (Node.js) on AWS Lambda with Docker

This project involves using the AWS CDK to deploy a TypeScript container to an AWS Lambda function.

## Prerequisites

- `docker.io`
- Node.js
- AWS CDK

## Deployment Instructions

### Create a Repository

First, create an ECR repository.

```bash
cdk deploy ECR
```

### Prepare Docker Image

Next, build the Docker image (make sure your current working directory is `lambda`).

```bash
docker image build . -t ts-lambda:latest
```

To test the code locally, use the following commands (don't forget to stop the container when finished).

```bash
docker container run -d --rm -p 8080:8080 ts-lambda:latest
curl localhost:8080/2015-03-31/functions/function/invocations -d '{}'
```

### Push Docker Image

Log in to ECR. You can find the login and push commands in the AWS Management Console under "View push commands."

```bash
aws ecr get-login-password --region ap-northeast-1 [--profile] \
| docker login --username AWS --password-stdin ${ACCOUNT}.dkr.ecr.ap-northeast-1.amazonaws.com
```

Push the image to ECR. You can find the login and push commands in the AWS Management Console under "View push commands."

```bash
docker tag ts-lambda:latest 381491991044.dkr.ecr.ap-northeast-1.amazonaws.com/ts-lambda:latest
docker push 381491991044.dkr.ecr.ap-northeast-1.amazonaws.com/ts-lambda:latest
```

### Deploy Lambda Function

Deploy the Lambda function.

```bash
cdk deploy Lambda
```

## Deleting Resources

To delete the resources:

```bash
cdk destroy --all
```
