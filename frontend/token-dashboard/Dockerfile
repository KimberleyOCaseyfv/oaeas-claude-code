# OAEAS Token Dashboard - Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Accept API URL at build time so React embeds it in the JS bundle
ARG REACT_APP_API_URL=http://localhost:8000
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Install deps first (layer-cache friendly)
COPY package*.json ./
RUN npm install

# Build the app
COPY . .
RUN npm run build

# ── Serve with nginx ──────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
