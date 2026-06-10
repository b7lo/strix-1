FROM node:20-slim AS builder

RUN npm install -g pnpm
WORKDIR /app

COPY strix-test/Strix-Assets-main/pnpm-lock.yaml strix-test/Strix-Assets-main/pnpm-workspace.yaml strix-test/Strix-Assets-main/package.json strix-test/Strix-Assets-main/tsconfig.base.json strix-test/Strix-Assets-main/tsconfig.json ./

COPY strix-test/Strix-Assets-main/lib ./lib
COPY strix-test/Strix-Assets-main/artifacts/admin-dashboard ./artifacts/admin-dashboard

RUN pnpm install --filter @workspace/admin-dashboard...
RUN pnpm --filter @workspace/admin-dashboard run build

FROM nginx:alpine
COPY --from=builder /app/artifacts/admin-dashboard/dist /usr/share/nginx/html

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
