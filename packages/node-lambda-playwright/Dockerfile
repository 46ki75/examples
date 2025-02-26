FROM node:22 as builder

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

RUN npm run build

#  https://gallery.ecr.aws/lambda/nodejs
FROM public.ecr.aws/lambda/nodejs:22

WORKDIR /app

COPY --from=builder /app/dist .

CMD [ "index.handler" ]