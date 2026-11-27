# Despliegue en un VPS con Docker

El stack tiene tres contenedores: **PostgreSQL/PostGIS**, la **API** (NestJS) y la **web** (nginx sirve la PWA y hace de proxy a la API en `/api`, así que comparten origen y no hace falta CORS). Hay dos servicios opcionales: **Caddy**, para HTTPS automático, y **ciencia**, para cargar los resultados del laboratorio virtual.

## Requisitos
- Docker Engine con el plugin `docker compose` (v2).
- **Un VPS amd64 (x86_64).** La imagen oficial `postgis/postgis` solo existe para amd64. En un VPS ARM, pon `POSTGIS_IMAGE=imresamu/postgis:17-3.5` en `.env` (imagen con soporte arm64).
- Para HTTPS: un dominio con un registro A apuntando al VPS y los puertos 80 y 443 abiertos.

## Primer despliegue
```bash
git clone https://github.com/ozioziel/Good4Gold---Frontend.git gold2 && cd gold2
cp .env.example .env
#   POSTGRES_PASSWORD=$(openssl rand -base64 24)
#   JWT_SECRET=$(openssl rand -base64 32)
#   (opcional) variables STELLAR_* y ESCROW_CONTRACT_ID para las campañas en testnet
nano .env

docker compose up -d --build          # web en http://IP_DEL_VPS (puerto PUERTO_WEB, 80 por defecto)
docker compose ps                     # db, api y web deben quedar «healthy»
docker compose logs -f api            # aplica migraciones y semillas al arrancar
```

**Resultados del laboratorio virtual** (tramos, huella minera, prioridades). Vienen en el repo y se cargan en segundos:
```bash
docker compose --profile laboratorio run --rm ciencia cargar
```

## HTTPS (recomendado)
La PWA sin conexión, la cámara para el QR y la billetera Freighter **necesitan HTTPS**.
1. En `.env`: `DOMINIO=gold2.tu-dominio.org` y `PUERTO_WEB=8080`. Caddy ocupa el 80 y el 443; nginx queda solo dentro de la red de Docker.
2. Levanta todo con el perfil `https`:
   ```bash
   docker compose --profile https up -d --build
   ```
   Caddy pide y renueva el certificado solo.

## Actualizar
```bash
git pull
docker compose up -d --build          # las migraciones nuevas se aplican al arrancar la API
docker compose --profile laboratorio run --rm ciencia cargar   # si cambiaron los resultados del laboratorio
```

## Operación
- **Respaldo de la base:** `docker compose exec db pg_dump -U gold2 gold2 > respaldo-$(date +%F).sql`
- **Consola de la base:** `docker compose exec db psql -U gold2 gold2` (la base no publica puertos hacia afuera).
- **Desactivar las semillas DEMO** en una instalación real: `SEMILLAS=0`. Las semillas son idempotentes, pero cargan datos de demostración.
- **Recalcular el laboratorio** (unas 1,5 h, depende de la red): `docker compose --profile laboratorio run --rm ciencia todo`. Luego conviene versionar los nuevos `science/datos/derivados` desde el repo.

## Seguridad
- `.env` contiene claves; nunca se sube a git (`.gitignore`) ni entra a las imágenes (`.dockerignore`).
- Las claves de Stellar son **solo de testnet**. La API rechaza otra red (`STELLAR_RED=testnet`).
- `AUTH_MODE=demo` permite elegir un rol sin cuenta. Es para la demostración, no para producción con datos reales.

## Detrás de un nginx del host (en vez de Caddy)
Si el servidor ya tiene nginx con varios sitios, publica la web solo en local y deja el TLS al nginx del host:
1. En `.env`: `PUERTO_WEB=127.0.0.1:8095` y `CORS_ORIGINS=https://tu-dominio`.
2. `docker compose up -d --build` (sin el perfil `https`).
3. Un `server` en `/etc/nginx/sites-available/` con `proxy_pass http://127.0.0.1:8095;` y los encabezados `Host`, `X-Forwarded-For` y `X-Forwarded-Proto`; luego `sudo certbot --nginx -d tu-dominio --redirect`.
