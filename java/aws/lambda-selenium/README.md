# Selenium on Lambda

## Build

```bash
./gradlew lambda-selenium:clean lambda-selenium:shadowJar
```

## Deploy

```bash
aws lambda update-function-code --function-name ${FUNCTION_NAME} \
--zip-file fileb://./lambda-selenium/build/libs/${JAR_NAME}.jar \
--output text
```
