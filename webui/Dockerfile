# syntax=docker/dockerfile:1.7
FROM node:25-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV NODE_OPTIONS=--max_old_space_size=4096

# Install deps first for caching
COPY webui/package.json webui/package-lock.json* ./
RUN npm ci

# Copy source and build
COPY webui/ ./
RUN npm run build   # outputs to /app/dist

# Add runtime config template + entrypoint script
COPY webui/config.template.js /app/dist/config.template.js
COPY webui/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
CMD ["/bin/sh", "-c", "/docker-entrypoint.sh"]
