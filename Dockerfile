# Build stage
FROM node:24-alpine3.23 AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --omit=dev

# Runtime stage
FROM node:24-alpine3.23 AS runtime

# Set environment variables in single layer
ENV PORT=8081 \
    NODE_ENV=production

WORKDIR /usr/src/app

# Remove npm to eliminate bundled CVEs
RUN rm -rf /usr/local/lib/node_modules/npm \
    /usr/local/bin/npm \
    /usr/local/bin/npx

# Copy dependencies from builder
COPY --from=builder --chown=node:node /usr/src/app/node_modules ./node_modules

# Copy application code
COPY --chown=node:node . .

EXPOSE 8081

CMD [ "node", "./bin/www" ]