#!/usr/bin/env bash
# Deja lista una VM Ubuntu 24.04 recién creada en Azure. Se corre UNA vez,
# conectado como el usuario "piko" (nunca como root):
#
#   ssh piko@<ip>
#   git clone https://github.com/dnnyhr/Piko-Aplicacion-para-el-aprendizaje-de-idiomas-.git piko
#   sudo bash piko/despliegue/preparar-vm.sh
#
# Qué hace: actualiza el sistema, cierra SSH (sin root, sin contraseña), prende
# el firewall (22, 80, 443), instala fail2ban y las actualizaciones automáticas
# de seguridad, e instala Docker dejando a "piko" usarlo sin sudo.
set -euo pipefail

USUARIO="${SUDO_USER:-piko}"
if [ "$USUARIO" = "root" ]; then
  echo "Corré esto con sudo desde el usuario piko, no como root." >&2
  exit 1
fi

echo "── 1/5 Sistema al día"
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl git ufw fail2ban unattended-upgrades

echo "── 2/5 SSH: sin root y solo con llave"
cat > /etc/ssh/sshd_config.d/10-piko.conf <<'CONF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
CONF
sshd -t
systemctl restart ssh

echo "── 3/5 Firewall: solo 22, 80 y 443"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "── 4/5 fail2ban y actualizaciones automáticas de seguridad"
systemctl enable --now fail2ban
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "── 5/5 Docker"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
usermod -aG docker "$USUARIO"
# Que los logs de los contenedores no llenen el disco.
cat > /etc/docker/daemon.json <<'CONF'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
CONF
systemctl restart docker

echo
echo "Listo. Cerrá la sesión y volvé a entrar (ssh piko@<ip>) para usar docker sin sudo."
