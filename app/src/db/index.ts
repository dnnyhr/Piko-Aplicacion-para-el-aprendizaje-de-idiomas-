/**
 * La base local.
 *
 * Una sola base por teléfono, compartida por los dos roles: si al maestro se
 * le acaba la batería, cualquier teléfono con la app puede levantar la sala
 * porque el esquema es idéntico.
 *
 * `abrirBase` viene de `base.ts` en el teléfono y de `base.web.ts` en el
 * navegador — Metro elige por plataforma. Lo de acá abajo es igual en ambos:
 * contra el driver vacío de la web simplemente no guarda nada.
 */

import type { SqlDriver } from './driver';

export { abrirBase } from './base';
export { NOMBRE_BASE, type BaseLocal } from './tipos';

// ------------------------------------------------------------------ preferencias

export function recordarAlumno(sql: SqlDriver, studentId: string | null): void {
  sql.run('UPDATE device SET ultimo_alumno = ? WHERE id = 1', [studentId]);
}

export function ultimoAlumno(sql: SqlDriver): string | null {
  return (
    sql.get<{ ultimo_alumno: string | null }>('SELECT ultimo_alumno FROM device WHERE id = 1')
      ?.ultimo_alumno ?? null
  );
}

export function recordarHost(sql: SqlDriver, ip: string | null): void {
  sql.run('UPDATE device SET ultimo_host = ? WHERE id = 1', [ip]);
}

export function ultimoHost(sql: SqlDriver): string | null {
  return (
    sql.get<{ ultimo_host: string | null }>('SELECT ultimo_host FROM device WHERE id = 1')
      ?.ultimo_host ?? null
  );
}

// --------------------------------------------------------------------- roster

export interface AlumnoGuardado {
  id: string;
  nombre: string;
  avatar: number;
  grado: string | null;
}

export function guardarRoster(sql: SqlDriver, alumnos: readonly AlumnoGuardado[]): void {
  sql.tx(() => {
    for (const a of alumnos) {
      sql.run(
        `INSERT INTO student (id, nombre, avatar, grado, creado_en)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           nombre = excluded.nombre,
           avatar = excluded.avatar,
           grado  = excluded.grado`,
        [a.id, a.nombre, a.avatar, a.grado, Date.now()],
      );
    }
  });
}

export function leerRoster(sql: SqlDriver): AlumnoGuardado[] {
  return sql.all<AlumnoGuardado>(
    'SELECT id, nombre, avatar, grado FROM student ORDER BY nombre COLLATE NOCASE ASC',
  );
}
