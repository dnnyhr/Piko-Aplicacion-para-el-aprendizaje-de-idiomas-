/**
 * Una interfaz mínima de SQL, para no atar la persistencia a `expo-sqlite`.
 *
 * Los tipos de los dos motores se declaran de forma estructural — nada se
 * importa acá. Así este archivo (y todo lo que lo use) se puede cargar en
 * vitest, y la implementación real del log se prueba contra `node:sqlite`
 * en vez de contra un doble de mentira.
 */

export interface SqlDriver {
  exec(sql: string): void;
  /** Devuelve cuántas filas cambiaron: así un `INSERT OR IGNORE` dice si entró. */
  run(sql: string, params?: readonly unknown[]): number;
  all<T>(sql: string, params?: readonly unknown[]): T[];
  get<T>(sql: string, params?: readonly unknown[]): T | null;
  tx(fn: () => void): void;
}

/** Los tipos que SQLite sabe atar a un `?`. */
export type ValorSql = string | number | boolean | null | Uint8Array;

/**
 * La forma de `SQLiteDatabase` de expo-sqlite que realmente usamos.
 *
 * Los parámetros son obligatorios y no opcionales, para calzar con la firma
 * de expo — el driver siempre pasa un arreglo, aunque sea vacío.
 */
export interface ExpoSqliteLike {
  execSync(source: string): void;
  runSync(source: string, params: ValorSql[]): { changes: number };
  getAllSync<T>(source: string, params: ValorSql[]): T[];
  getFirstSync<T>(source: string, params: ValorSql[]): T | null;
  withTransactionSync(task: () => void): void;
}

/** La forma de `DatabaseSync` de `node:sqlite`. */
export interface NodeSqliteLike {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: unknown[]): { changes: number | bigint };
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
  };
}

const atar = (params?: readonly unknown[]): ValorSql[] => (params ? [...params] : []) as ValorSql[];

export function driverExpo(db: ExpoSqliteLike): SqlDriver {
  return {
    exec: (sql) => db.execSync(sql),
    run: (sql, params) => db.runSync(sql, atar(params)).changes,
    all: <T,>(sql: string, params?: readonly unknown[]) => db.getAllSync<T>(sql, atar(params)),
    get: <T,>(sql: string, params?: readonly unknown[]) => db.getFirstSync<T>(sql, atar(params)),
    tx: (fn) => db.withTransactionSync(fn),
  };
}

export function driverNode(db: NodeSqliteLike): SqlDriver {
  // `node:sqlite` recibe los parámetros sueltos, no en un arreglo.
  return {
    exec: (sql) => db.exec(sql),
    run: (sql, params = []) => Number(db.prepare(sql).run(...params).changes),
    all: <T,>(sql: string, params: readonly unknown[] = []) =>
      db.prepare(sql).all(...params) as T[],
    get: <T,>(sql: string, params: readonly unknown[] = []) =>
      (db.prepare(sql).get(...params) ?? null) as T | null,
    tx: (fn) => {
      db.exec('BEGIN');
      try {
        fn();
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },
  };
}
