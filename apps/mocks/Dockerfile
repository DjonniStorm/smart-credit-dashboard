# Сборка из корня репозитория: docker build -f apps/mocks/Dockerfile .
FROM node:24-alpine AS base
RUN npm install -g pnpm@11.25.0 turbo@2.11.9
WORKDIR /app

FROM base AS prune
COPY . .
RUN turbo prune mocks --docker

FROM base AS build
COPY --from=prune /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=prune /app/out/full/ .
RUN turbo run build --filter=mocks
RUN pnpm --filter=mocks deploy --prod --legacy /prod/mocks

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production     PORT=4100
COPY --from=build --chown=node:node /prod/mocks ./
USER node
EXPOSE 4100
CMD ["node", "dist/main.js"]
