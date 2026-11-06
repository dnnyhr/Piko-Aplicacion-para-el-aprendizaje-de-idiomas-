/**
 * D1 sobre libSQL: la misma forma que el binding de Cloudflare (prepare →
 * bind → first/all/run, y batch), contra un libsql-server (sqld) por red o
 * un archivo SQLite local. libSQL es SQLite, así que el SQL del Worker y las
 * migraciones corren tal cual, sin reescribir ninguna consulta.
 *
 * Es el hermano de test/d1-falso.mjs, que hace lo mismo sobre node:sqlite.
 */

import { createClient } from '@libsql/client';

/** Las filas de libSQL traen también índices numéricos; el Worker espera objetos planos. */
function filas(rs) {
  return rs.rows.map((r) => Object.fromEntries(rs.columns.map((c, i) => [c, r[i]])));
}

function meta(rs) {
  return { changes: rs.rowsAffected, last_row_id: rs.lastInsertRowid === undefined ? null : Number(rs.lastInsertRowid) };
}

class Sentencia {
  constructor(cliente, sql, args = []) {
    this.cliente = cliente;
    this.sql = sql;
    this.args = args;
  }
  bind(...args) {
    return new Sentencia(this.cliente, this.sql, args);
  }
  get crudo() {
    return { sql: this.sql, args: this.args };
  }
  async first() {
    return filas(await this.cliente.execute(this.crudo))[0] ?? null;
  }
  async all() {
    return { results: filas(await this.cliente.execute(this.crudo)), success: true };
  }
  async run() {
    const rs = await this.cliente.execute(this.crudo);
    return { results: filas(rs), success: true, meta: meta(rs) };
  }
}

/** url: http://db:8080 (sqld) o file:encuestas.db (local). authToken solo si sqld lo pide. */
export function d1Libsql({ url, authToken }) {
  const cliente = createClient({ url, authToken: authToken || undefined, intMode: 'number' });
  return {
    prepare: (sql) => new Sentencia(cliente, sql),
    // Como en D1: todas o ninguna.
    async batch(sentencias) {
      const rs = await cliente.batch(sentencias.map((s) => s.crudo), 'write');
      return rs.map((r) => ({ results: filas(r), success: true, meta: meta(r) }));
    },
    cliente,
  };
}
