# Java on AWS Lambda

- **handler(lambda)**: `example.Handler::handleRequest`
- **Runtime**: `Java 21`

## Build

```bash
../gradlew clean shadowJar
```

## Deploy (Update)

You can deploy jar file directly.

```bash
aws lambda update-function-code --function-name ${FUNCTION_NAME} \
--zip-file fileb://./lambda/build/libs/lambda.jar 
```

## Invoke Locally

```bash
../gradlew clean run
```
