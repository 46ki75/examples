# node-lambda-template

## Manually Managed Resources

- `shared-46ki75-examples-s3-bucket-sam`: S3 bucket used for SAM deployments

## Deploying .zip File Archives

<!-- WIP -->

## Deploying Container Images

### Build the Docker Image

```bash
docker image build -t node-lambda-template .
```

### Run the Container Locally

Start the Lambda runtime:

```bash
docker run -p 9000:8080 node-lambda-template
```

Invoke the Lambda function:

```bash
curl -X POST "http://localhost:9000/2015-03-31/functions/function/invocations" \
    -H "Content-Type: application/json" \
    -d '{ "key": "value" }'
```

## Deploying .zip File Archives with AWS SAM

### Build and Test Locally

Build your project:

```bash
npm run build
```

Build the SAM application:

```bash
sam build --template ./template-zip.yaml
```

Invoke the function locally:

```bash
sam local invoke --template ./template-zip.yaml
```

### Deploy to AWS

```bash
sam deploy \
    --stack-name shared-46ki75-examples-cloudformation-stack-sam-zip \
    --template ./template-zip.yaml \
    --s3-bucket shared-46ki75-examples-s3-bucket-sam \
    --capabilities CAPABILITY_IAM
```

### Remove the Stack

```bash
sam delete --stack-name shared-46ki75-examples-cloudformation-stack-sam-zip
```

## Deploying Container Images with AWS SAM

### Build and Test Locally (Container)

```bash
sam build --template ./template-container.yaml
```

```bash
sam local invoke --template ./template-container.yaml
```

### Deploy to AWS (Container)

<!-- WIP -->
