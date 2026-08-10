/**
 * Simulador de aula.
 *
 *   npm run sim -- --students 8 --rondas 2
 *
 * Levanta un host real y N clientes reales hablando TCP sobre localhost, con
 * exactamente el mismo código que corre en los teléfonos. Sirve para tres cosas:
 *
 *   1. Desarrollar la lógica de sala sin tener ocho teléfonos a mano.
 *   2. Verificar que la sincronización converge aunque se caiga un cliente.
 *   3. Ser el plan B en la demo del hackathon si falla un equipo.
 */

import { mulberry32 } from '../src/core/ids';
import { MemoryEventLog, MemorySnapshotStore } from '../src/core/sync/log';
import { project } from '../src/core/progress/projection';
import type { PresetSummary } from '../src/core/protocol/messages';
import type { Item } from '../src/core/content/schema';
import { AulaHost, type AlumnoRoster } from '../src/net/host';
import { EstudianteCliente } from '../src/net/client';
import { transporteNode } from '../src/net/tcp.node';
import { cargarPacks } from './packs';

// ------------------------------------------------------------------ argumentos

function arg(nombre: string, porDefecto: number): number {
  const i = process.argv.indexOf(`--${nombre}`);
  if (i === -1) return porDefecto;
  const v = Number(process.argv[i + 1]);
  return Number.isFinite(v) ? v : porDefecto;
}

const N = Math.max(1, arg('students', 8));
const RONDAS = Math.max(1, arg('rondas', 2));
const SEMILLA = arg('seed', 20261028);

const NOMBRES = [
  'Ana', 'Beto', 'Carla', 'Dario', 'Elena', 'Fabio', 'Gabi', 'Hugo',
  'Ivania', 'Josué', 'Karla', 'Luis', 'Marta', 'Nery', 'Olga', 'Pablo',
];

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pct = (n: number, d: number) => (d === 0 ? '  0%' : `${String(Math.round((n / d) * 100)).padStart(3)}%`);

// ------------------------------------------------------------------ escenario

async function main(): Promise<void> {
  const rng = mulberry32(SEMILLA);
  const packs = await cargarPacks();
  const disponibles = packs.filter((p) => p.items.length > 0);

  if (disponibles.length === 0) {
    console.error('No hay paquetes con contenido en content/packs/. Nada que simular.');
    process.exit(1);
  }

  const roster: AlumnoRoster[] = Array.from({ length: N }, (_, i) => ({
    id: `s${i + 1}`,
    nombre: NOMBRES[i % NOMBRES.length] ?? `Alumno ${i + 1}`,
    avatar: i % 6,
  }));

  const preset: PresetSummary = {
    id: 'sim',
    nombre: 'Simulación',
    lang: 'eng',
    themes: [],
    difficulty: 1,
    count: 8,
  };

  const logHost = new MemoryEventLog();
  const snapshots = new MemorySnapshotStore();
  const host = new AulaHost({
    transporte: transporteNode,
    packs: disponibles,
    roster,
    preset,
    log: logHost,
    snapshots,
    sessionId: `sim-${SEMILLA}`,
    rng,
  });

  await host.abrir(0);
  console.log(`\n  PIKO — simulador de aula`);
  console.log(`  ${'─'.repeat(52)}`);
  console.log(`  sala ${host.roomCode}   puerto ${host.puerto}   ${N} estudiantes   ${RONDAS} ronda(s)`);
  console.log(`  ${disponibles.length} paquete(s), ${disponibles.reduce((n, p) => n + p.items.length, 0)} ítems\n`);

  // -------------------------------------------------------------- conexión

  const clientes = await Promise.all(
    roster.map(async (alumno, i) => {
      const log = new MemoryEventLog();
      const cliente = new EstudianteCliente({
        transporte: transporteNode,
        deviceId: `tel-${i + 1}`,
        log,
        autoReconectar: true,
        rng: mulberry32(SEMILLA + i + 1),
      });
      const listo = new Promise<void>((resolve) => {
        const quitar = cliente.on((e) => {
          if (e.tipo === 'identidad') {
            quitar();
            resolve();
          }
        });
      });
      await cliente.conectar('127.0.0.1', host.puerto);
      cliente.reclamar(alumno.id);
      await listo;
      return { alumno, cliente, log };
    }),
  );
  console.log(`  ✓ ${clientes.length} estudiantes conectados y con identidad\n`);

  // ---------------------------------------------------------------- rondas

  for (let ronda = 1; ronda <= RONDAS; ronda++) {
    const items = new Map<string, Item[]>();
    const recibidas = clientes.map(
      ({ alumno, cliente }) =>
        new Promise<void>((resolve) => {
          const quitar = cliente.on((e) => {
            if (e.tipo === 'ronda') {
              items.set(alumno.id, e.items);
              quitar();
              resolve();
            }
          });
        }),
    );

    host.iniciarRonda({ count: 8, duracionMs: 60_000 });
    await Promise.all(recibidas);

    const listas = [...items.values()].map((is) => is.map((i) => i.id).join('|'));
    const identicas = new Set(listas).size === 1;
    console.log(`  Ronda ${ronda}: todos recibieron ${identicas ? 'los mismos' : '¡DISTINTOS!'} ítems`);
    if (!identicas) process.exitCode = 1;

    // Cada estudiante responde con una destreza propia y estable.
    for (const [indice, { alumno, cliente }] of clientes.entries()) {
      const destreza = 0.35 + (indice / Math.max(1, clientes.length - 1)) * 0.6;
      const suyos = items.get(alumno.id) ?? [];
      const propio = mulberry32(SEMILLA + ronda * 100 + indice);
      for (const item of suyos) {
        cliente.responder({
          item,
          packId: 'sim',
          correct: propio() < destreza,
          ms: 600 + Math.floor(propio() * 2500),
        });
      }
    }

    // A mitad de ronda se cae un teléfono: es lo que pasa en un aula real.
    const victima = clientes[Math.floor(clientes.length / 2)];
    if (victima) {
      console.log(`  ⚡ se cae el teléfono de ${victima.alumno.nombre} y vuelve a conectarse`);
      victima.cliente.desconectar();
      await dormir(150);
      await victima.cliente.conectar('127.0.0.1', host.puerto);
      await dormir(250);
    }

    for (const { cliente } of clientes) cliente.sincronizar();
    await dormir(400);
    host.terminarRonda();
    await dormir(150);
  }

  // ------------------------------------------------------- comprobaciones

  console.log(`\n  Convergencia`);
  console.log(`  ${'─'.repeat(52)}`);

  let fallas = 0;
  for (const { alumno, cliente, log } of clientes) {
    const enHost = project(alumno.id, logHost.all(alumno.id));
    const enTelefono = cliente.estado;
    const pendientes = log.pending(alumno.id).length;

    const converge =
      enHost.answered === enTelefono.answered &&
      enHost.correct === enTelefono.correct &&
      enHost.xp === enTelefono.xp;
    if (!converge || pendientes > 0) fallas++;

    console.log(
      `  ${converge && pendientes === 0 ? '✓' : '✗'} ${alumno.nombre.padEnd(8)}` +
        ` host ${String(enHost.correct).padStart(2)}/${String(enHost.answered).padStart(2)}` +
        `   teléfono ${String(enTelefono.correct).padStart(2)}/${String(enTelefono.answered).padStart(2)}` +
        `   ${pct(enTelefono.correct, enTelefono.answered)}` +
        `   ${String(enTelefono.xp).padStart(4)} xp` +
        (pendientes > 0 ? `   ⚠ ${pendientes} sin sincronizar` : ''),
    );
  }

  // ------------------------------------------------- teléfono prestado

  const primero = clientes[0];
  if (primero) {
    const prestado = new EstudianteCliente({
      transporte: transporteNode,
      deviceId: 'tel-prestado',
      log: new MemoryEventLog(),
      autoReconectar: false,
      rng: mulberry32(SEMILLA + 999),
    });
    primero.cliente.desconectar();
    await dormir(150);

    const recuperado = new Promise<{ answered: number; correct: number; xp: number }>((resolve) => {
      const quitar = prestado.on((e) => {
        if (e.tipo === 'identidad') {
          quitar();
          resolve(e.estado);
        }
      });
    });
    await prestado.conectar('127.0.0.1', host.puerto);
    prestado.reclamar(primero.alumno.id);
    const estado = await recuperado;

    const original = project(primero.alumno.id, logHost.all(primero.alumno.id));
    const ok = estado.answered === original.answered && estado.xp === original.xp;
    if (!ok) fallas++;

    console.log(`\n  Teléfono prestado`);
    console.log(`  ${'─'.repeat(52)}`);
    console.log(
      `  ${ok ? '✓' : '✗'} ${primero.alumno.nombre} entra en un teléfono que nunca la vio ` +
        `y recupera ${estado.correct}/${estado.answered} y ${estado.xp} xp`,
    );
    prestado.desconectar();
  }

  // ------------------------------------------------------------- semáforo

  console.log(`\n  Semáforo del maestro (los de arriba necesitan ayuda)`);
  console.log(`  ${'─'.repeat(52)}`);
  const luz = { rojo: '🔴', ambar: '🟡', verde: '🟢' } as const;
  for (const fila of host.semaforo()) {
    const nombre = roster.find((a) => a.id === fila.studentId)?.nombre ?? fila.studentId;
    console.log(
      `  ${luz[fila.semaforo]} ${nombre.padEnd(8)} ${String(fila.correct).padStart(2)}/${String(fila.answered).padStart(2)} correctas`,
    );
  }

  console.log(`\n  ${'─'.repeat(52)}`);
  console.log(
    fallas === 0
      ? `  Todo converge. ${logHost.size} eventos en el host.\n`
      : `  ${fallas} comprobación(es) fallaron.\n`,
  );
  if (fallas > 0) process.exitCode = 1;

  for (const { cliente } of clientes) cliente.desconectar();
  await host.cerrar();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
