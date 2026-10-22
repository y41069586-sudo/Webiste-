# syntax=docker/dockerfile:1.7
# Multi-Stage-Build für Web (Next.js standalone) und Worker (pg-boss + Playwright).

ARG NODE_IMAGE=node:22-bookworm-slim
ARG PLAYWRIGHT_IMAGE=mcr.microsoft.com/playwright:v1.56.1-noble

# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /repo

# ---------------------------------------------------------------------------
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
COPY packages/core/package.json packages/core/
COPY packages/templates/package.json packages/templates/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
FROM deps AS build
COPY . .
RUN pnpm --filter @wbm/templates build \
 && pnpm --filter @wbm/web build

# ---------------------------------------------------------------------------
# Web: Next.js standalone (enthält nur die benötigten node_modules)
FROM ${NODE_IMAGE} AS web
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1 APP_NAME=wbm-web
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /data/storage && chown -R node:node /data
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "apps/web/server.js"]

# ---------------------------------------------------------------------------
# Worker: Playwright-Image (Chromium für PDFs/Screenshots/QA) + tsx
FROM ${PLAYWRIGHT_IMAGE} AS worker
ENV NODE_ENV=production PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true APP_NAME=wbm-worker \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright MIGRATIONS_DIR=/repo/packages/core/drizzle
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate \
 && apt-get update && apt-get install -y --no-install-recommends fonts-dejavu-core fonts-liberation2 && rm -rf /var/lib/apt/lists/*
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/core/package.json packages/core/
COPY packages/templates/package.json packages/templates/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod --filter "@wbm/worker..."
COPY packages/core packages/core
COPY packages/templates packages/templates
COPY apps/worker apps/worker
COPY --from=build /repo/packages/templates/dist packages/templates/dist
RUN mkdir -p /data/storage /backups && chown -R pwuser:pwuser /data /backups
USER pwuser
WORKDIR /repo/apps/worker
CMD ["pnpm", "start"]
