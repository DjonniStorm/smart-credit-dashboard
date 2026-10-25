# Сборка из корня репозитория: docker build -f apps/api/Dockerfile .
FROM node:24-alpine AS base
RUN apk add --no-cache git
RUN npm install -g pnpm@11.25.0 turbo@2.11.9
WORKDIR /app

FROM base AS prune
COPY . .
RUN turbo prune api --docker

FROM base AS build
COPY --from=prune /app/out/json/ .
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY --from=prune /app/out/full/ .
RUN turbo run build --filter=api
RUN pnpm --filter=api deploy --prod --legacy --ignore-scripts /prod/api

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production     PORT=4000
COPY --from=build --chown=node:node /prod/api ./
USER node
EXPOSE 4000
CMD ["node", "dist/main.js"]
