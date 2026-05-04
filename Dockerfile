FROM node:24-alpine AS fnl_base_image

# Update npm to 11.13.0 to fix picomatch CVE-2026-33671
RUN npm install -g npm@11.13.0

ENV PORT=8081
ENV NODE_ENV=production
ENV NODE_OPTIONS=--openssl-legacy-provider
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY  --chown=node:node . .

EXPOSE 8081

# Run as non-root user for security
USER node

CMD [ "node", "./bin/www" ]