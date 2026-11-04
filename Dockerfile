FROM node:24-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/website/package.json apps/website/package.json
COPY apps/account/package.json apps/account/package.json
COPY apps/store/package.json apps/store/package.json
COPY backend/package.json backend/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/design-system/package.json packages/design-system/package.json
RUN npm ci
COPY . .
ARG APP=website
ARG NEXT_PUBLIC_WEBSITE_URL=https://voidclient.org
ARG NEXT_PUBLIC_ACCOUNT_URL=https://voidclient.org/account
ARG NEXT_PUBLIC_STORE_URL=https://voidclient.org/store
ARG NEXT_PUBLIC_DISCORD_INVITE
ARG NEXT_PUBLIC_PRIVACY_URL
ARG NEXT_PUBLIC_TERMS_URL
ARG NEXT_PUBLIC_REFUND_URL
ARG NEXT_PUBLIC_DOWNLOAD_WINDOWS
ARG NEXT_PUBLIC_DOWNLOAD_LINUX
ARG NEXT_PUBLIC_DOWNLOAD_MACOS
ARG NEXT_PUBLIC_DOWNLOAD_ANDROID
ARG NEXT_PUBLIC_DOWNLOAD_IOS
ARG NEXT_PUBLIC_CLIENT_VERSION
ARG NEXT_PUBLIC_CLIENT_RELEASE_DATE
ENV NEXT_PUBLIC_WEBSITE_URL=$NEXT_PUBLIC_WEBSITE_URL NEXT_PUBLIC_ACCOUNT_URL=$NEXT_PUBLIC_ACCOUNT_URL NEXT_PUBLIC_STORE_URL=$NEXT_PUBLIC_STORE_URL
ENV NEXT_PUBLIC_DISCORD_INVITE=$NEXT_PUBLIC_DISCORD_INVITE NEXT_PUBLIC_PRIVACY_URL=$NEXT_PUBLIC_PRIVACY_URL NEXT_PUBLIC_TERMS_URL=$NEXT_PUBLIC_TERMS_URL NEXT_PUBLIC_REFUND_URL=$NEXT_PUBLIC_REFUND_URL
ENV NEXT_PUBLIC_DOWNLOAD_WINDOWS=$NEXT_PUBLIC_DOWNLOAD_WINDOWS NEXT_PUBLIC_DOWNLOAD_LINUX=$NEXT_PUBLIC_DOWNLOAD_LINUX NEXT_PUBLIC_DOWNLOAD_MACOS=$NEXT_PUBLIC_DOWNLOAD_MACOS NEXT_PUBLIC_DOWNLOAD_ANDROID=$NEXT_PUBLIC_DOWNLOAD_ANDROID NEXT_PUBLIC_DOWNLOAD_IOS=$NEXT_PUBLIC_DOWNLOAD_IOS
ENV NEXT_PUBLIC_CLIENT_VERSION=$NEXT_PUBLIC_CLIENT_VERSION NEXT_PUBLIC_CLIENT_RELEASE_DATE=$NEXT_PUBLIC_CLIENT_RELEASE_DATE
RUN npm run db:generate && npm run build --workspace=@void/${APP}

FROM node:24-bookworm-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ARG APP=website
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 VOID_APP=$APP
COPY --from=build --chown=node:node /app/apps/${APP}/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/${APP}/.next/static ./apps/${APP}/.next/static
COPY --from=build --chown=node:node /app/apps/${APP}/public ./apps/${APP}/public
USER node
EXPOSE 3000
CMD ["sh", "-c", "node apps/$VOID_APP/server.js"]
