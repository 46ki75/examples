FROM public.ecr.aws/lambda/nodejs:22 AS builder

WORKDIR /app

COPY . .

RUN npm i -g pnpm && pnpm i && pnpm run build

FROM public.ecr.aws/lambda/nodejs:22

COPY --from=builder /app/dist/lambda/index.mjs index.mjs

CMD [ "index.handler" ]
