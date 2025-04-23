# node-lambda-template

## Deploy .zip file archives

<!-- WIP -->

## Deploy container images

### Build Images

```bash
docker image build -t node-lambda-template .
```

### Run Locally

First, run the container to start the Lambda runtime:

```bash
docker run -p 9000:8080 node-lambda-template
```

Then, invoke the Lambda function using an HTTP request:

```bash
curl -X POST "http://localhost:9000/2015-03-31/functions/function/invocations" \
    -H "Content-Type: application/json" \
    -d '{ "key": "value" }'
```
