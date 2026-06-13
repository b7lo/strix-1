FROM node:20-slim AS builder

RUN npm install -g pnpm
WORKDIR /app

# Copy workspace configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json tsconfig.json ./

# Copy shared libraries and the landing-page application
COPY lib ./lib
COPY artifacts/landing-page ./artifacts/landing-page

# Install dependencies and build
RUN pnpm install --filter @workspace/landing-page...
RUN pnpm --filter @workspace/landing-page run build

# Use Nginx to serve the static built files
FROM nginx:alpine
COPY --from=builder /app/artifacts/landing-page/dist /usr/share/nginx/html

# Copy a basic nginx configuration to handle routing
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
