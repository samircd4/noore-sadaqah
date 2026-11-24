# Production image for the Next.js site (docs/DEPLOYMENT.md: VPS via compose.prod.yaml, or SnapDeploy).
# Development uses Dockerfile.dev through the root compose.yaml instead.
#
# Build settings (build args; SnapDeploy passes only NEXT_PUBLIC_* variables into the build):
#   BUILD_API_URL              Django's API to read content from while building. VPS: http://127.0.0.1:8000/api/v1
#                              (compose.prod.yaml builds on the host network). Not used at run time.
#   NEXT_PUBLIC_DJANGO_ORIGIN  hosts without a proxy in front (SnapDeploy): the backend app's address. Next.js then
#                              forwards /api/, /admin/, /r/, /media/ to it, and builds from its content.
#   neither: the pages are built from the mock fixtures in read-only "static" mode (pre-launch site)
#   NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_MEDIA_HOST  as in .env.example
# Run-time settings (API_MODE, API_INTERNAL_URL, REVALIDATE_SECRET …) are set on the app, not here.

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-slim AS build
WORKDIR /app
ARG BUILD_API_URL=""
ARG NEXT_PUBLIC_DJANGO_ORIGIN=""
ARG NEXT_PUBLIC_SITE_URL=""
ARG NEXT_PUBLIC_MEDIA_HOST=""
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_DJANGO_ORIGIN=$NEXT_PUBLIC_DJANGO_ORIGIN \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_MEDIA_HOST=$NEXT_PUBLIC_MEDIA_HOST
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# With a backend address the build reads live content from it; without one it uses the fixtures, read only.
RUN if [ -n "$BUILD_API_URL" ]; then \
        API_MODE=live API_INTERNAL_URL="$BUILD_API_URL" npm run build; \
    elif [ -n "$NEXT_PUBLIC_DJANGO_ORIGIN" ]; then \
        API_MODE=live API_INTERNAL_URL="${NEXT_PUBLIC_DJANGO_ORIGIN%/}/api/v1" npm run build; \
    else \
        API_MODE=static npm run build; \
    fi

# The run image holds only Next's standalone server (output: "standalone" in next.config.mjs).
FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
# The host sets PORT; server.js listens on it.
EXPOSE 3000
CMD ["node", "server.js"]
