FROM node:22-alpine AS base

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile

RUN pnpm --filter api build

EXPOSE 4000

CMD ["pnpm", "--filter", "api", "start"]