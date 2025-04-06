# Java on AWS Lambda

- **handler(lambda)**: `example.handler.Handler::handleRequest`
- **Runtime**: `Java 21`

## Build

```bash
../gradlew clean shadowJar
```

## Deploy (Update)

You can deploy jar file (`./build/libs/lambda-java.jar`) directly.

- Handler: `example.handler.Handler::handleRequest`

## Invoke Locally

```bash
../gradlew clean invoke
```
