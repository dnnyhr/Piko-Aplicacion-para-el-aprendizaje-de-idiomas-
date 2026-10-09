#!/usr/bin/env bash
# Deja el servidor exactamente igual a main de GitHub y reconstruye lo que
# cambió. Lo corre el deploy automático (.github/workflows/desplegar.yml) en
# cada merge a main, o a mano como piko:
#   ~/piko/despliegue/actualizar.sh
set -euo pipefail
cd "$(dirname "$0")/.."

# Igual a origin/main, sin cambios locales (despliegue/.env no está en git y no se toca).
git fetch --quiet origin main
git checkout --quiet main
git reset --quiet --hard origin/main

# El commit que queda corriendo: la API lo dice en /api/salud y el sitio en /version.json.
VERSION="$(git rev-parse HEAD)"
export VERSION
printf '{"commit":"%s","rama":"main","desplegado":"%s"}\n' "$VERSION" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > web/version.json

cd despliegue
docker compose up -d --build --remove-orphans
# La plantilla de Nginx está montada, no va en la imagen: se vuelve a completar
# y se recarga solo si pasa nginx -t (si no, sigue la configuración anterior).
docker compose exec -T nginx sh -c '/docker-entrypoint.d/20-envsubst-on-templates.sh >/dev/null && nginx -t -q && nginx -s reload'
docker compose ps
echo "Corriendo main @ ${VERSION:0:7}"
