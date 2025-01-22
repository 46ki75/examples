FROM docker.io/gradle:jdk21-corretto AS build

WORKDIR /app

COPY build.gradle.kts /app/

RUN gradle dependencies

COPY src /app/src

RUN gradle shadowJar

RUN echo $(jar tf /app/build/libs/lambda-selenium.jar)

FROM public.ecr.aws/lambda/java:21 AS runtime

COPY --from=build /app/build/libs/lambda-selenium.jar ${LAMBDA_TASK_ROOT}/

RUN cd ${LAMBDA_TASK_ROOT} && jar -xf lambda-selenium.jar && rm lambda-selenium.jar

CMD [ "example.Handler::handleRequest" ]

