FROM node:22-alpine AS builder

# Install build tools for native modules
RUN apk add --no-cache python3 make g++ 

WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --no-frozen-lockfile

# Build the frontend
COPY . .
RUN pnpm run build

# Remove dev dependencies
RUN pnpm prune --prod

# ---- Production stage ----
FROM node:22-alpine AS runner

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/package.json ./package.json

# Rebuild native modules for the production alpine image
RUN npm rebuild better-sqlite3

EXPOSE 5000

CMD ["node", "server/server.js"]
