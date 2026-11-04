FROM node:24-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
RUN npm ci && npm run db:generate && npm run build --workspace=@void/backend && npm prune --omit=dev --ignore-scripts

FROM node:24-bookworm-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/backend/dist ./backend/dist
ENV NODE_ENV=production BACKEND_PORT=3003
USER node
EXPOSE 3003
CMD ["node", "backend/dist/server.mjs"]
