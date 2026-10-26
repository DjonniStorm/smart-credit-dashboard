# Сборка из каталога сайта: docker build -t alfa-docs docs/prod/site
FROM node:24-alpine AS build
WORKDIR /site
ENV PUPPETEER_SKIP_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /site/doc_build /srv
COPY Caddyfile /etc/caddy/Caddyfile
