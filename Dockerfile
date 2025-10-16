FROM node:23.4-alpine3.21 AS fnl_base_image

ENV PORT 8081
ENV NODE_ENV production
ENV NODE_OPTIONS --openssl-legacy-provider
WORKDIR /usr/src/app
RUN apk update && apk upgrade --no-cache openssl libcrypto3 libssl3
COPY package*.json ./
RUN npm ci --only=production
COPY  --chown=node:node . .
EXPOSE 8081
CMD [ "node", "./bin/www" ]
