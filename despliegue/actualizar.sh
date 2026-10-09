#!/usr/bin/env bash
# Bajar lo último de main y reconstruir lo que cambió. Se corre como piko:
#   ~/piko/despliegue/actualizar.sh
set -euo pipefail
cd "$(dirname "$0")"
git pull --ff-only
docker compose up -d --build
docker compose ps
