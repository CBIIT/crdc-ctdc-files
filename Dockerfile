FROM node:24-alpine3.23 AS fnl_base_image

# Update npm to 11.14.1 to fix picomatch CVE-2026-33671 and bundled ip-address
RUN npm install -g npm@11.14.1

ENV PORT=8081
ENV NODE_ENV=production
ENV NODE_OPTIONS=--openssl-legacy-provider
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY  --chown=node:node . .

EXPOSE 8081

CMD [ "node", "./bin/www" ]
