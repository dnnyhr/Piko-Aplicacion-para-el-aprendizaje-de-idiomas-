# Las encuestas de Piko en Node (servidor/node.mjs), para el servidor de Azure.
# En Cloudflare siguen corriendo con wrangler; esta imagen no cambia eso.
FROM node:22-alpine

ENV NODE_ENV=production PUERTO=8787
WORKDIR /srv/encuestas

# Primero las dependencias, para que Docker las guarde en caché entre builds.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY servidor ./servidor
COPY public ./public
COPY migrations ./migrations

# Nunca como root: la imagen de Node ya trae el usuario "node".
USER node
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8787/api/salud || exit 1

CMD ["node", "servidor/node.mjs"]
