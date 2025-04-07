FROM docker.io/library/node:22 AS build

WORKDIR /app
COPY . .
RUN npm i -g pnpm && pnpm i && pnpm run build

FROM public.ecr.aws/lambda/nodejs:22

COPY --from=build /app/dist/src/* ${LAMBDA_TASK_ROOT}
COPY --from=build /app/package.json ${LAMBDA_TASK_ROOT}

CMD [ "index.handler" ]
