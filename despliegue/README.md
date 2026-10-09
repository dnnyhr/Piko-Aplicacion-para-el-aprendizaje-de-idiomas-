# Piko en Azure

Esta guía arma un servidor propio en Azure para el sitio de Piko y para sus encuestas, paso a paso y desde cero.
`piko.mugiware.com` sigue en Netlify y las encuestas siguen en Cloudflare. Esto se suma a eso y no lo reemplaza.

| Dirección | Qué sirve |
|---|---|
| `https://azure.piko.mugiware.com` | El sitio (`web/`) y la app web (`/probar/app`) |
| `https://api.piko.mugiware.com` | Las encuestas y su API (`encuestas/`) |

```
Internet ──443──▶ nginx ─┬─ azure.piko.mugiware.com → web/ (archivos, comprimidos)
   (único puerto          └─ api.piko.mugiware.com   → api:8787 ──▶ db:8080
    abierto)                                          (Node)        (libSQL, volumen)
                         └────────── red interna de Docker ──────────────┘
VM Ubuntu 24.04 en Azure · usuario piko (no root) · SSH solo con llave · ufw · fail2ban
```

## Qué cubre cada entregable

Los del sprint 3 (errores amigables, JWT, despliegue automático y Azure igual a main) están en [docs/entregables-sprint-3.md](../docs/entregables-sprint-3.md).

| Entregable | Dónde está |
|---|---|
| **1. Compilación final** | La app web sale minificada de `npm run web:sitio`. Nginx la comprime con gzip, usa HTTP/2 y deja guardar en caché por un año los archivos que llevan huella en el nombre. El APK sale de `eas build --profile production`, con ProGuard y shrink ([paso 9](#9-compilación-final)). |
| **2. Servidor seguro** | Usuario `piko`, root bloqueado por SSH, sin contraseñas, firewall, fail2ban y actualizaciones automáticas (`preparar-vm.sh`). Monitoreo con Azure Monitor y una prueba de disponibilidad ([paso 8](#8-monitoreo)). |
| **3. Proxy inverso** | Nginx (`nginx/piko.conf.template`) es lo único con puertos publicados. La API y la base no tienen ninguno. |
| **4. Contenedores** | `docker-compose.yml` levanta `nginx`, `api` (`encuestas/Dockerfile`, corre como usuario `node` y con el disco en solo lectura), `db` (libSQL) y `certbot`. |
| **5. Conexión y CORS** | Los secretos van en `despliegue/.env`, que solo existe en el servidor. La API responde con CORS únicamente a los orígenes de `CORS_ORIGINS`, y nunca en `/api/admin/*`. La portada lo usa para mostrar el contador de la comunidad. |

### Cómo corre el Worker en Node

`encuestas/src/index.js` es el mismo código que corre en Cloudflare. `encuestas/servidor/node.mjs` le arma lo que Cloudflare le daba hecho:

- `env.DB`: la API de D1 sobre libSQL (`servidor/d1-libsql.mjs`). libSQL es SQLite, así que ninguna consulta cambia.
- `env.ASSETS`: los archivos de `public/`.
- Las variables de entorno, que salen del `.env`.

Las migraciones se aplican solas cada vez que arranca el contenedor (`servidor/migrar.mjs`).

---

## 0. Lo que hace falta

- Una cuenta de Azure. **Azure for Students** da crédito gratis y no pide tarjeta: https://azure.microsoft.com/free/students
- Acceso a Cloudflare, donde está el DNS de `mugiware.com`.
- En tu compu: `ssh`. Opcional: la [CLI de Azure](https://learn.microsoft.com/cli/azure/install-azure-cli) (`az`).

## 1. Crear la máquina virtual

### Desde el portal (lo más fácil)

1. En https://portal.azure.com, entrá a **Máquinas virtuales → Crear → Máquina virtual de Azure**.
2. Completá así:
   - **Grupo de recursos**: nuevo, `piko`.
   - **Nombre**: `piko-vm`. **Región**: `East US` (o la más barata que te ofrezca).
   - **Imagen**: *Ubuntu Server 24.04 LTS*.
   - **Tamaño**: `Standard_B2s` (2 vCPU, 4 GB). `B1ms` también alcanza.
   - **Tipo de autenticación**: **Clave pública SSH**.
   - **Nombre de usuario**: `piko`. Este es el usuario estándar con el que se administra todo; nunca se usa root.
   - **Origen de la clave**: *Generar nuevo par de claves*. Descargá el `.pem` y guardalo bien: es la única llave.
   - **Puertos de entrada públicos**: SSH (22), HTTP (80) y HTTPS (443).
3. En **Supervisión**, dejá activado *Diagnóstico de arranque*.
4. Tocá **Revisar y crear → Crear** y anotá la **IP pública**.
5. Recomendado: en **Redes → Reglas de puerto de entrada**, editá la regla de SSH para que el origen sea solo tu IP.

### O con la CLI

```bash
az login
az group create -n piko -l eastus
az vm create -g piko -n piko-vm --image Ubuntu2404 --size Standard_B2s \
  --admin-username piko --generate-ssh-keys --public-ip-sku Standard
az vm open-port -g piko -n piko-vm --port 80,443 --priority 900
az vm show -d -g piko -n piko-vm --query publicIps -o tsv
```

## 2. El DNS en Cloudflare

En Cloudflare, entrá a **mugiware.com → DNS → Records → Add record** y creá dos registros:

| Tipo | Nombre | Contenido | Proxy |
|---|---|---|---|
| A | `azure.piko` | la IP de la VM | **DNS only** (nube gris) |
| A | `api.piko` | la IP de la VM | **DNS only** (nube gris) |

**¿Por qué la nube gris?** Hay dos razones:

1. El certificado gratis de Cloudflare cubre `*.mugiware.com`, pero no `*.piko.mugiware.com`. Con la nube naranja, el navegador daría un error de certificado.
2. Con la nube gris, el tráfico llega directo a tu Nginx y Let's Encrypt puede emitir el certificado en el servidor. HTTPS lo pone tu propio servidor, que es lo que se evalúa.

Comprobá que ya resuelven. Puede tardar un par de minutos:

```bash
dig +short azure.piko.mugiware.com
dig +short api.piko.mugiware.com
```

## 3. Entrar y preparar el servidor

```bash
chmod 600 ~/Descargas/piko-vm_key.pem
ssh -i ~/Descargas/piko-vm_key.pem piko@<IP>
```

Ya en la VM, como `piko`:

```bash
git clone https://github.com/dnnyhr/Piko-Aplicacion-para-el-aprendizaje-de-idiomas-.git piko
sudo bash piko/despliegue/preparar-vm.sh
exit
```

`preparar-vm.sh` hace lo siguiente:

- Actualiza el sistema.
- Cierra SSH: `PermitRootLogin no` y `PasswordAuthentication no`.
- Prende `ufw`, abriendo solo 22, 80 y 443.
- Instala `fail2ban` y las actualizaciones automáticas de seguridad.
- Instala Docker con un tope de tamaño para los logs.
- Suma a `piko` al grupo `docker`, para que no haga falta sudo.

Volvé a entrar (`ssh -i … piko@<IP>`) para que tome el grupo nuevo, y comprobá:

```bash
docker run --rm hello-world     # sin sudo
sudo ufw status                 # 22, 80, 443
```

## 4. Los secretos (variables ocultas)

```bash
cd ~/piko/despliegue
cp .env.example .env
openssl rand -hex 24            # copiá esto: va a ser el ADMIN_TOKEN
nano .env                       # pegá el ADMIN_TOKEN; revisá los dominios y CORS_ORIGINS
chmod 600 .env
```

- `.env` **no va a git**: el `.gitignore` de la raíz lo ignora. Solo existe en el servidor y solo `piko` puede leerlo.
- Docker se lo pasa al contenedor `api` como variables de entorno (`env_file`).
- `CORS_ORIGINS` lista exactamente qué sitios pueden pedir el contador desde el navegador: `https://piko.mugiware.com,https://azure.piko.mugiware.com`.

**Qué es secreto y qué no:**

- Son secretos `ADMIN_TOKEN` y `RESEND_API_KEY`, y viven solo en el `.env`.
- No es secreta la dirección de la API (`<meta name="piko-api">` en `web/index.html`): el navegador la necesita para pedir el contador. Lo que la protege es CORS y que la parte de admin pide el token.

## 5. El certificado HTTPS (una sola vez)

Nginx no arranca sin certificado, así que el primero se pide con certbot en modo *standalone*, antes de levantar todo:

```bash
cd ~/piko/despliegue
docker compose run --rm -p 80:80 --entrypoint certbot certbot certonly --standalone \
  --cert-name certificado-piko \
  -d azure.piko.mugiware.com -d api.piko.mugiware.com \
  -m tu-correo@ejemplo.com --agree-tos -n
```

Después, el contenedor `certbot` lo renueva solo cada 12 horas si hace falta, y Nginx se recarga cada 12 horas para tomarlo.

## 6. Levantar todo

```bash
cd ~/piko/despliegue
docker compose up -d --build
docker compose ps                       # api "healthy", nginx y db "running"
docker compose exec nginx nginx -t      # la config de Nginx es válida
docker compose logs -f api              # Ctrl+C para salir
```

Para probar desde tu compu:

```bash
curl https://api.piko.mugiware.com/api/salud
curl -sI https://azure.piko.mugiware.com | head -5
```

## 7. Publicar las encuestas en el servidor nuevo

Desde tu compu, en el repo:

```bash
cd encuestas
PIKO_ENCUESTAS_URL=https://api.piko.mugiware.com PIKO_ENCUESTAS_TOKEN=<el ADMIN_TOKEN> npm run publicar
```

Queda así:

- La encuesta abre en `https://api.piko.mugiware.com/e/tu-lengua`.
- El panel de resultados está en `https://api.piko.mugiware.com/admin`.
- Cada respuesta nueva sube el contador de la portada en unos 30 segundos. Es una buena demo en vivo.

## 8. Monitoreo

### En Azure (lo que se muestra en la entrega)

1. **Métricas de la VM**: en la VM, **Supervisión → Métricas**, mirá *Percentage CPU*, *Available Memory Bytes* y *Disk*. Para guardarlas a la vista, usá **Anclar al panel**.
2. **Alertas**: en la VM, **Supervisión → Alertas → Crear regla de alerta**.
   - *Percentage CPU*, mayor que 80 % durante 5 minutos, con un grupo de acciones que mande un correo al equipo.
   - Opcional: *Available Memory Bytes* menor que 300 MB.
3. **Prueba de disponibilidad** (avisa si la API se cae):
   1. Creá un recurso **Application Insights** (`piko-monitor`, en el mismo grupo).
   2. Entrá a **Disponibilidad → Agregar prueba estándar**.
   3. URL `https://api.piko.mugiware.com/api/salud`, cada 5 minutos, desde 3 ubicaciones, esperando un 200.
   4. Activá la alerta con el mismo grupo de acciones.
4. Opcional: **Insights de VM** (**Supervisión → Insights → Habilitar**) para ver procesos y conexiones.

Con la CLI, la alerta de CPU queda así:

```bash
az monitor action-group create -g piko -n equipo-piko --action email equipo tu-correo@ejemplo.com
az monitor metrics alert create -g piko -n cpu-alta \
  --scopes $(az vm show -g piko -n piko-vm --query id -o tsv) \
  --condition "avg Percentage CPU > 80" --window-size 5m --evaluation-frequency 1m \
  --action equipo-piko
```

### En el servidor

```bash
docker compose ps          # estado y healthcheck de cada contenedor
docker stats --no-stream   # CPU y memoria por contenedor
docker compose logs --tail 100 nginx api
sudo fail2ban-client status sshd
```

## 9. Compilación final

**App web.** Con la app al día, en tu compu:

```bash
cd app && npm run web:sitio      # exporta minificado a web/probar/app
```

Subí `web/probar/app/` a git y en el servidor corré `~/piko/despliegue/actualizar.sh`.

**APK de producción** (ProGuard, minify y shrink ya están en `app/app.json`):

```bash
cd app && npx eas-cli build -p android --profile production
```

**Comprobar la compresión y la caché:**

```bash
curl -sI -H 'Accept-Encoding: gzip' https://azure.piko.mugiware.com/assets/js/portada.js | grep -i content-encoding
curl -sI https://azure.piko.mugiware.com/probar/app/ | grep -i -E 'HTTP|cache'
```

**Lighthouse.** En Chrome, abrí DevTools → Lighthouse → *Mobile* sobre `https://azure.piko.mugiware.com/probar/app/` y guardá la captura.

## 10. Pruebas para la entrega

Corré esto y guardá las capturas:

```bash
# Root no entra; piko sí, solo con llave
ssh root@<IP>                                    # → Permission denied
ssh -o PubkeyAuthentication=no piko@<IP>         # → Permission denied (no hay contraseña)

# Solo Nginx da a internet; api y db no tienen puertos publicados
docker compose ps --format 'table {{.Name}}\t{{.Ports}}'
curl -m 5 http://<IP>:8787 ; curl -m 5 http://<IP>:8080   # → no conecta

# CORS: el sitio sí, otro origen no
curl -si -H 'Origin: https://piko.mugiware.com' https://api.piko.mugiware.com/api/publico/contador | grep -i access-control-allow-origin
curl -si -H 'Origin: https://malo.example'      https://api.piko.mugiware.com/api/publico/contador | grep -i access-control-allow-origin   # → nada
```

En el navegador, abrí `https://piko.mugiware.com`: la sección **La comunidad · en vivo** muestra los números.
Si sacás ese origen de `CORS_ORIGINS` y reiniciás la API (`docker compose up -d api`), la consola muestra *blocked by CORS policy* y la sección no aparece.

## 11. Actualizar

Azure corre **exactamente main de GitHub**. `actualizar.sh` hace `git reset --hard origin/main`, reconstruye y deja anotado el commit:

- `https://azure.piko.mugiware.com/version.json` → `{"commit": "<sha de main>", ...}`
- `https://api.piko.mugiware.com/api/salud` → `{"ok": true, "version": "<sha de main>"}`

### Automático, en cada merge a main

[`.github/workflows/desplegar.yml`](../.github/workflows/desplegar.yml) corre cuando CI pasa en main: entra por SSH, corre `actualizar.sh` y comprueba en vivo que el sitio y la API digan el mismo commit que GitHub, que HTTP lleve a HTTPS y que el 404 sea el amigable. Para prenderlo, una sola vez:

```bash
# En tu compu: una llave solo para desplegar
ssh-keygen -t ed25519 -N '' -C deploy-github -f piko-deploy
ssh-copy-id -i piko-deploy.pub -o IdentityFile=~/Descargas/piko-vm_key.pem piko@<IP>
ssh-keyscan -H <IP>            # la salida va en AZURE_VM_KNOWN_HOSTS
```

En GitHub, **Settings → Secrets and variables → Actions → New repository secret**:

| Secreto | Valor |
|---|---|
| `AZURE_VM_HOST` | la IP de la VM |
| `AZURE_VM_SSH_KEY` | el contenido de `piko-deploy` (la privada) |
| `AZURE_VM_KNOWN_HOSTS` | lo que imprimió `ssh-keyscan` |

Después, **Actions → Desplegar en Azure → Run workflow** para probarlo. Sin `AZURE_VM_HOST` el workflow solo avisa y no falla.

### A mano

```bash
~/piko/despliegue/actualizar.sh     # igual a origin/main + docker compose up -d --build
```

Respaldo de la base:

```bash
docker compose exec db sh -c 'tar czf - /var/lib/sqld' > respaldo-$(date +%F).tgz
```

## Problemas comunes

| Síntoma | Causa probable |
|---|---|
| certbot: *Timeout during connect* | El DNS todavía no apunta a la VM, la nube de Cloudflare está naranja o el puerto 80 está cerrado en Azure o en `ufw`. |
| nginx se reinicia en bucle | Falta el certificado (paso 5) o el `.env` no tiene `DOMINIO_WEB`/`DOMINIO_API`. Mirá `docker compose logs nginx`. |
| api *unhealthy* | `docker compose logs api`. Si dice *la base todavía no responde*, revisá `docker compose logs db`. |
| La portada no muestra el contador | Abrí la consola del navegador. Si dice *CORS*, falta el origen en `CORS_ORIGINS`. Si dice *ERR_NAME_NOT_RESOLVED*, falta el DNS de `api.piko`. |
| El panel dice *La sesión venció* | El JWT dura 8 horas, o cambió `ADMIN_TOKEN`/`JWT_SECRET`. Volvé a entrar con la contraseña. |
| `ADMIN_TOKEN` rechazado | Tiene que tener 16 caracteres o más. Usá `openssl rand -hex 24`. |
