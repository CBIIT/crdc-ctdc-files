FROM node:22.9-alpine3.19 AS fnl_base_image

ENV PORT 8081
ENV NODE_ENV production
ENV NODE_OPTIONS --openssl-legacy-provider
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY  --chown=node:node . .
EXPOSE 8081
CMD [ "node", "./bin/www" ]
