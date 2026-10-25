# Сборка из корня репозитория: docker build -f apps/backoffice/Dockerfile .
FROM node:24-alpine AS base
RUN apk add --no-cache git
RUN npm install -g pnpm@11.25.0 turbo@2.11.9
WORKDIR /app

FROM base AS prune
COPY . .
RUN turbo prune backoffice --docker

FROM base AS build
COPY --from=prune /app/out/json/ .
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY --from=prune /app/out/full/ .
RUN turbo run build --filter=backoffice

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production     HOSTNAME=0.0.0.0     PORT=3001
COPY --from=build --chown=node:node /app/apps/backoffice/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/backoffice/.next/static ./apps/backoffice/.next/static
COPY --from=build --chown=node:node /app/apps/backoffice/public ./apps/backoffice/public
USER node
EXPOSE 3001
CMD ["node", "apps/backoffice/server.js"]
