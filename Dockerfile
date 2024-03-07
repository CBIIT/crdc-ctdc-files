FROM node:16.20.2-alpine3.18
ENV PORT 8081
ENV NODE_ENV production
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY  --chown=node:node . .
EXPOSE 8081
CMD [ "node", "./bin/www" ]
