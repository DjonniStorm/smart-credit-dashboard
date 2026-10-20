# Сборка из корня репозитория: docker build -f apps/client/Dockerfile .
FROM node:24-alpine AS base
RUN npm install -g pnpm@11.25.0 turbo@2.11.9
WORKDIR /app

FROM base AS prune
COPY . .
RUN turbo prune client --docker

FROM base AS build
COPY --from=prune /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=prune /app/out/full/ .
RUN turbo run build --filter=client

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production     HOSTNAME=0.0.0.0     PORT=3000
COPY --from=build --chown=node:node /app/apps/client/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/client/.next/static ./apps/client/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/client/server.js"]
