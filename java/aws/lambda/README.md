# Java on AWS Lambda

- **handler(lambda)**: `example.Handler::handleRequest`
- **Runtime**: `Java 21`

## Build

```bash
../gradlew clean shadowJar
```

## Deploy (Update)

You can deploy jar file (`./build/libs/lambda.jar`) directly.

## Invoke Locally

```bash
../gradlew clean run
```
