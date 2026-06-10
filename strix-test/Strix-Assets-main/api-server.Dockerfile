FROM node:20-slim

RUN npm install -g pnpm
WORKDIR /app

# Copy workspace configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json tsconfig.json ./

# Copy shared libraries and the API server application
COPY lib ./lib
COPY artifacts/api-server ./artifacts/api-server

# Install dependencies and build
RUN pnpm install --filter @workspace/api-server...
RUN pnpm --filter @workspace/api-server run build

EXPOSE 3000

ENV PORT=3000
CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
