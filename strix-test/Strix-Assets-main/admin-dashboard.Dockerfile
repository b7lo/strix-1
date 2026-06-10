FROM node:20-slim AS builder

RUN npm install -g pnpm
WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL:-https://dashboard.awadhdev.tech/api/dashboard}

# Copy workspace configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json tsconfig.json ./

# Copy shared libraries and the dashboard application
COPY lib ./lib
COPY artifacts/admin-dashboard ./artifacts/admin-dashboard

# Install dependencies and build
RUN pnpm install --filter @workspace/admin-dashboard...
RUN pnpm --filter @workspace/admin-dashboard run build

# Use Nginx to serve the static built files
FROM nginx:alpine
COPY --from=builder /app/artifacts/admin-dashboard/dist /usr/share/nginx/html

# Copy a basic nginx configuration to handle React routing
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
