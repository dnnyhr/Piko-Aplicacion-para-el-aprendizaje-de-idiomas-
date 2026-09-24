/**
 * Lee los contactos que se pegan a mano en el panel: uno por línea, con un
 * correo, un número o los dos, y el nombre si se quiere. Acepta lo que la
 * gente escribe de verdad:
 *
 *   Ana López, ana@correo.com
 *   +505 8888 1234
 *   Carlos — carlos@correo.com — 8888-5555
 */

import { esCorreo, esTelefono } from '../public/js/reglas.js';

export const MAX_LINEAS = 100;

/** Número guardable: solo dígitos, con + adelante si lo tenía. Así "8888 1234" y "8888-1234" son el mismo. */
export function normalizarTelefono(t) {
  const s = String(t).trim();
  return (s.startsWith('+') ? '+' : '') + s.replace(/\D/g, '');
}

export function leerContactos(texto) {
  const lineas = String(texto ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const contactos = [];
  const invalidas = [];

  for (const linea of lineas.slice(0, MAX_LINEAS)) {
    let resto = linea;
    const correo = (resto.match(/[^\s,;:<>()"']+@[^\s,;:<>()"']+/) ?? [])[0];
    if (correo) resto = resto.replace(correo, ' ');
    const telefono = (resto.match(/\+?\d[\d\s().-]{6,}\d/) ?? [])[0];
    if (telefono) resto = resto.replace(telefono, ' ');

    const correoOk = correo && esCorreo(correo) ? correo.toLowerCase() : null;
    const telefonoOk = telefono && esTelefono(telefono) ? normalizarTelefono(telefono) : null;
    const nombre =
      resto
        .replace(/[,;:<>()|"'—–-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 60) || null;

    if (!correoOk && !telefonoOk) invalidas.push(linea);
    else contactos.push({ nombre, correo: correoOk, telefono: telefonoOk });
  }
  return { contactos, invalidas, recortado: lineas.length > MAX_LINEAS };
}
