FROM node:20-slim

RUN npm install -g pnpm
WORKDIR /app

COPY strix-test/Strix-Assets-main/pnpm-lock.yaml strix-test/Strix-Assets-main/pnpm-workspace.yaml strix-test/Strix-Assets-main/package.json strix-test/Strix-Assets-main/tsconfig.base.json strix-test/Strix-Assets-main/tsconfig.json ./

COPY strix-test/Strix-Assets-main/lib ./lib
COPY strix-test/Strix-Assets-main/artifacts/api-server ./artifacts/api-server

RUN pnpm install --filter @workspace/api-server...
RUN pnpm --filter @workspace/api-server run build

EXPOSE 3000

ENV PORT=3000
CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
