/**
 * Arma `figma/plugin/code.js`: el código del plugin con la captura y la
 * auditoría adentro. Figma no deja que un plugin lea archivos del disco, así
 * que los datos viajan dentro del código.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN = join(dirname(fileURLToPath(import.meta.url)), '..', 'plugin');
const datos = readFileSync(join(PLUGIN, 'datos', 'captura.json'), 'utf8');
const auditoria = readFileSync(join(PLUGIN, 'datos', 'auditoria.json'), 'utf8');
const codigo = readFileSync(join(PLUGIN, 'src', 'plugin.js'), 'utf8');

const salida = `// Generado por figma/captura/construir-plugin.mjs — no editar a mano.
// Fuente: figma/plugin/src/plugin.js · Datos: figma/plugin/datos/
var DATOS = ${datos};
var AUDITORIA = ${auditoria};
${codigo}`;
writeFileSync(join(PLUGIN, 'code.js'), salida);
console.log(`code.js: ${(salida.length / 1024 / 1024).toFixed(2)} MB`);
