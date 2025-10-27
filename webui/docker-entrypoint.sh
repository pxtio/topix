#!/bin/sh
# default if not provided by docker compose
API_ORIGIN="${API_ORIGIN:-http://localhost:8888}"

# inject runtime API value into config.js
sed "s|\${API_ORIGIN}|${API_ORIGIN}|g" /app/dist/config.template.js > /app/dist/config.js

# serve built files with vite preview
exec npx vite preview --host 0.0.0.0 --port 80 --strictPort --outDir /app/dist