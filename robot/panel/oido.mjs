/**
 * Enciende el oído de Piko (robot/escucha/servidor.py) con el Python de su
 * entorno, para no tener que recordar la ruta.
 *
 *   npm run oido
 *
 * Usa robot/escucha/.venv si existe; si no, el python3 del sistema. Los
 * argumentos que sobran se le pasan al servidor (`npm run oido -- --puerto 4720`).
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ESCUCHA = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'escucha');
const candidatos = [
  path.join(ESCUCHA, '.venv', 'bin', 'python'),
  path.join(ESCUCHA, '.venv', 'Scripts', 'python.exe'),   // Windows
];
const python = candidatos.find((p) => fs.existsSync(p)) || (process.platform === 'win32' ? 'python' : 'python3');

const hijo = spawn(python, ['servidor.py', ...process.argv.slice(2)], { cwd: ESCUCHA, stdio: 'inherit' });
hijo.on('exit', (codigo) => process.exit(codigo ?? 0));
for (const senal of ['SIGINT', 'SIGTERM']) process.on(senal, () => hijo.kill(senal));
