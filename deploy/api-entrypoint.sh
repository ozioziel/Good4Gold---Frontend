#!/bin/sh
# Aplica migraciones pendientes (y, si SEMILLAS=1, las semillas idempotentes) y arranca la API.
set -e
if [ "${SEMILLAS:-0}" = "1" ]; then
  node scripts/migrar.mts --semillas
else
  node scripts/migrar.mts
fi
exec node dist/main.js
