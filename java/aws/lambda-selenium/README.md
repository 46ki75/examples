# Selenium on Lambda

- **handler(lambda)**: `example.Handler::handleRequest`
- **Runtime**: `Java 21`

## Build

```bash
../gradlew clean shadowJar
./gradlew lambda-selenium:clean lambda-selenium:shadowJar
```

## Deploy (Update)

You can deploy jar file directly.

```bash
aws lambda update-function-code --function-name ${FUNCTION_NAME} \
--zip-file fileb://./lambda-selenium/build/libs/${JAR_NAME}.jar \
--output text
```

## Invoke Locally

```bash
../gradlew clean run
./gradlew lambda-selenium:clean lambda-selenium:run
```
