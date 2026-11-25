FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production VOID_HOST=0.0.0.0 PORT=3000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node server.mjs shared-server.mjs shared-auth.mjs account-store.mjs database.mjs payments.mjs ./
COPY --chown=node:node database ./database
USER node
EXPOSE 3000
CMD ["node", "server.mjs"]
