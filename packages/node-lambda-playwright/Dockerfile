#  https://gallery.ecr.aws/lambda/nodejs
FROM public.ecr.aws/lambda/nodejs:22

COPY package.json .

RUN npm install

COPY . .

RUN npm run build

CMD [ "dist/index.handler" ]