# syntax=docker/dockerfile:1.7
# Multi-Stage-Build für Web (Next.js standalone) und Worker (pg-boss + Playwright).

ARG NODE_IMAGE=node:22-bookworm-slim

# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true NEXT_TELEMETRY_DISABLED=1 NODE_USE_ENV_PROXY=1
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /repo

# ---------------------------------------------------------------------------
FROM base AS deps
COPY . .
RUN --mount=type=secret,id=proxy_ca --mount=type=cache,id=pnpm,target=/pnpm/store \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
FROM deps AS templates-build
RUN pnpm --filter @wbm/templates build

FROM templates-build AS build
RUN pnpm --filter @wbm/web build

# ---------------------------------------------------------------------------
# Web: Next.js standalone (enthält nur die benötigten node_modules)
FROM ${NODE_IMAGE} AS web
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1 APP_NAME=wbm-web
WORKDIR /app
RUN mkdir -p /data/storage && chown -R node:node /data
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]

# ---------------------------------------------------------------------------
# Worker: only Chromium is needed; avoid shipping WebKit/Firefox with the worker.
FROM base AS worker
ENV NODE_ENV=production APP_NAME=wbm-worker MIGRATIONS_DIR=/repo/packages/core/drizzle \
    CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
RUN apt-get update && apt-get install -y --no-install-recommends chromium fonts-liberation ca-certificates osmium-tool \
    && rm -rf /var/lib/apt/lists/*
COPY --chown=node:node . .
RUN --mount=type=secret,id=proxy_ca --mount=type=cache,id=pnpm,target=/pnpm/store \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    pnpm install --frozen-lockfile --prod --filter "@wbm/worker..."
COPY --from=templates-build --chown=node:node /repo/packages/templates/dist packages/templates/dist
RUN mkdir -p /data/storage /data/osm /backups && chown -R node:node /data /backups
USER node
WORKDIR /repo/apps/worker
CMD ["node", "--import", "tsx", "src/index.ts"]
