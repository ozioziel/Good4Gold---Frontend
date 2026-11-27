# Frontend de Gold2Life (Vite + React) servido por nginx. Build desde la raíz del repo:
#   docker build -f apps/web/Dockerfile --build-arg VITE_API_URL=/api .
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
RUN npm ci --workspace apps/web --include-workspace-root=false --no-audit --no-fund
COPY apps/web apps/web
# URL del API vista desde el navegador. «/api» = mismo dominio, nginx hace de proxy (sin CORS).
ARG VITE_API_URL=/api
ARG VITE_BRAND_NAME=Gold2Life
ENV VITE_API_URL=$VITE_API_URL VITE_BRAND_NAME=$VITE_BRAND_NAME
# El typecheck se corre en desarrollo (npm run typecheck); aquí solo el build de producción.
RUN cd apps/web && npx vite build

FROM nginx:1.29-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=4s --retries=5 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
