# syntax=docker/dockerfile:1.7

# --- Build stage ---
FROM --platform=linux/arm64 node:25 AS build

WORKDIR /app
ENV NODE_OPTIONS=--max_old_space_size=4096

COPY webui/package.json webui/package-lock.json* ./
RUN npm ci

COPY webui/ ./
RUN npm run build   # outputs to /app/dist

# --- Production stage ---
FROM --platform=linux/arm64 node:25-slim

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY webui/config.template.js /app/dist/config.template.js
COPY webui/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
CMD ["/bin/sh", "-c", "/docker-entrypoint.sh"]
