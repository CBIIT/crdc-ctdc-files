ARG ALPINE_VERSION=3.24
ARG APK_CHECK_CERTIFICATE=true

# npm is required only while installing dependencies. The final image starts
# from Alpine so npm and its bundled dependency tree are not present at all.
FROM node:24-alpine${ALPINE_VERSION} AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --omit=dev

FROM alpine:${ALPINE_VERSION} AS runtime
ARG APK_CHECK_CERTIFICATE

# Upgrade the base packages (including BusyBox) and install the only shared
# library required by the Node.js musl binary.
RUN if [ "${APK_CHECK_CERTIFICATE}" = "false" ]; then apk_tls_args="--no-check-certificate"; else apk_tls_args=""; fi \
    && apk ${apk_tls_args} upgrade --no-cache \
    && apk ${apk_tls_args} add --no-cache libstdc++ \
    && addgroup -g 1000 node \
    && adduser -u 1000 -G node -s /bin/sh -D node

ENV PORT=8081 \
    NODE_ENV=production

WORKDIR /usr/src/app
RUN mkdir -p logs && chown node:node logs

COPY --from=builder /usr/local/bin/node /usr/local/bin/node
COPY --from=builder --chown=node:node /usr/src/app/node_modules ./node_modules
COPY --chown=node:node . .

EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "const http = require('http'); const request = http.get({ host: '127.0.0.1', port: process.env.PORT || 8081, path: '/' }, response => process.exit(response.statusCode < 500 ? 0 : 1)); request.on('error', () => process.exit(1));"

USER node

CMD ["node", "./bin/www"]
