FROM node:22 as builder

WORKDIR /app

COPY package.json .

RUN npm install -g pnpm && pnpm install

COPY . .

RUN pnpm run build


#  https://gallery.ecr.aws/lambda/nodejs
FROM public.ecr.aws/lambda/nodejs:22

COPY --from=builder /app/dist .

COPY package.json .

CMD [ "index.handler" ]