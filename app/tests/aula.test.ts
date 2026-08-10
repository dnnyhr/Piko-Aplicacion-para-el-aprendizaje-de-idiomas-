/**
 * Integración de la sala sobre TCP real (localhost).
 *
 * No hay mocks del socket: se levanta el mismo `AulaHost` y el mismo
 * `EstudianteCliente` que corren en el teléfono. Lo único distinto es el
 * transporte, que acá es `node:net` en vez de `react-native-tcp-socket`.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { AulaHost, type AlumnoRoster } from '@/net/host';
import { EstudianteCliente, type ClienteEvento } from '@/net/client';
import { transporteNode } from '@/net/tcp.node';
import { MemoryEventLog, MemorySnapshotStore } from '@core/sync/log';
import { PROTOCOL_VERSION, type PresetSummary } from '@core/protocol/messages';
import { mulberry32 } from '@core/ids';
import { packDemo } from './helpers';

const ROSTER: AlumnoRoster[] = [
  { id: 'a1', nombre: 'Ana', avatar: 0 },
  { id: 'b2', nombre: 'Beto', avatar: 1 },
  { id: 'c3', nombre: 'Carla', avatar: 2 },
];

const PRESET: PresetSummary = {
  id: 'p1',
  nombre: 'Saludos fácil',
  lang: 'eng',
  themes: ['saludos'],
  difficulty: 1,
  count: 4,
};

const abiertos: { cerrar: () => Promise<void> | void }[] = [];

afterEach(async () => {
  while (abiertos.length) await abiertos.pop()?.cerrar();
});

async function levantarHost(extra: Partial<ConstructorParameters<typeof AulaHost>[0]> = {}) {
  const log = new MemoryEventLog();
  const snapshots = new MemorySnapshotStore();
  const host = new AulaHost({
    transporte: transporteNode,
    packs: [packDemo],
    roster: ROSTER,
    preset: PRESET,
    log,
    snapshots,
    sessionId: 'sesion-prueba',
    rng: mulberry32(1),
    ...extra,
  });
  await host.abrir(0);
  abiertos.push({ cerrar: () => host.cerrar() });
  return { host, log, snapshots };
}

let semillaCliente = 0;

function crearCliente(deviceId: string, log = new MemoryEventLog()) {
  const cliente = new EstudianteCliente({
    transporte: transporteNode,
    deviceId,
    log,
    autoReconectar: false,
    // Semilla distinta por cliente: con la misma, dos teléfonos generarían los
    // mismos uuid de evento y no se estaría probando nada realista.
    rng: mulberry32(++semillaCliente * 7919),
  });
  abiertos.push({ cerrar: () => cliente.desconectar() });
  return { cliente, log };
}

/** Espera un evento del cliente, con timeout para que un fallo no cuelgue la suite. */
function esperar<T extends ClienteEvento['tipo']>(
  cliente: EstudianteCliente,
  tipo: T,
  ms = 4000,
): Promise<Extract<ClienteEvento, { tipo: T }>> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      quitar();
      reject(new Error(`no llegó ningún evento "${tipo}" en ${ms} ms`));
    }, ms);
    const quitar = cliente.on((e) => {
      if (e.tipo !== tipo) return;
      clearTimeout(t);
      quitar();
      resolve(e as Extract<ClienteEvento, { tipo: T }>);
    });
  });
}

const respirar = (ms = 60) => new Promise((r) => setTimeout(r, ms));

describe('sala del aula', () => {
  it('el estudiante se conecta y recibe la lista de la clase', async () => {
    const { host } = await levantarHost();
    const { cliente } = crearCliente('tel-A');

    const bienvenida = esperar(cliente, 'bienvenida');
    await cliente.conectar('127.0.0.1', host.puerto);
    const b = await bienvenida;

    expect(b.roomCode).toBe(host.roomCode);
    expect(b.roster.map((r) => r.nombre)).toEqual(['Ana', 'Beto', 'Carla']);
    expect(b.roster.every((r) => !r.tomado)).toBe(true);
    expect(b.preset?.nombre).toBe('Saludos fácil');
  });

  it('reclama identidad y queda registrado en la sesión', async () => {
    const { host } = await levantarHost();
    const { cliente } = crearCliente('tel-A');

    await cliente.conectar('127.0.0.1', host.puerto);
    await esperar(cliente, 'bienvenida');

    const identidad = esperar(cliente, 'identidad');
    cliente.reclamar('a1');
    const id = await identidad;

    expect(id.studentId).toBe('a1');
    expect(id.estado.answered).toBe(0);
    await respirar();
    expect(host.sesion.presentes).toContain('a1');
  });

  it('rechaza a quien no está en la lista', async () => {
    const { host } = await levantarHost();
    const { cliente } = crearCliente('tel-A');
    await cliente.conectar('127.0.0.1', host.puerto);
    await esperar(cliente, 'bienvenida');

    const rechazo = esperar(cliente, 'rechazo');
    cliente.reclamar('no-existe');
    expect((await rechazo).code).toBe('noEstaEnLista');
  });

  it('no deja que dos teléfonos usen el mismo nombre a la vez', async () => {
    const { host } = await levantarHost();
    const { cliente: uno } = crearCliente('tel-A');
    const { cliente: dos } = crearCliente('tel-B');

    await uno.conectar('127.0.0.1', host.puerto);
    await esperar(uno, 'bienvenida');
    uno.reclamar('a1');
    await esperar(uno, 'identidad');

    await dos.conectar('127.0.0.1', host.puerto);
    await esperar(dos, 'bienvenida');
    const rechazo = esperar(dos, 'rechazo');
    dos.reclamar('a1');

    const r = await rechazo;
    expect(r.code).toBe('yaTomado');
    expect(r.reason).toContain('Ana');
  });

  it('marca en el roster quién ya está tomado', async () => {
    const { host } = await levantarHost();
    const { cliente: uno } = crearCliente('tel-A');
    await uno.conectar('127.0.0.1', host.puerto);
    await esperar(uno, 'bienvenida');
    uno.reclamar('a1');
    await esperar(uno, 'identidad');
    await respirar();

    const { cliente: dos } = crearCliente('tel-B');
    const bienvenida = esperar(dos, 'bienvenida');
    await dos.conectar('127.0.0.1', host.puerto);
    const b = await bienvenida;

    expect(b.roster.find((r) => r.id === 'a1')?.tomado).toBe(true);
    expect(b.roster.find((r) => r.id === 'b2')?.tomado).toBe(false);
  });

  it('corta a un cliente que habla otra versión del protocolo', async () => {
    const { host } = await levantarHost();
    const { cliente } = crearCliente('tel-viejo');
    const rechazo = esperar(cliente, 'rechazo');

    // Se habla el protocolo a mano para simular una app desactualizada.
    const conexion = await transporteNode.conectar('127.0.0.1', host.puerto);
    conexion.send(
      JSON.stringify({
        t: 'hello',
        v: PROTOCOL_VERSION + 99,
        deviceId: 'viejo',
        appVersion: '0.0.1',
      }) + '\n',
    );
    const recibido = await new Promise<string>((resolve) => conexion.onData(resolve));
    conexion.close();
    void cliente;
    void rechazo.catch(() => undefined);

    expect(JSON.parse(recibido.trim())).toMatchObject({ t: 'denied', code: 'version' });
  });
});

describe('ronda sincronizada', () => {
  it('todos los teléfonos reciben los mismos ítems', async () => {
    const { host } = await levantarHost();
    const { cliente: uno } = crearCliente('tel-A');
    const { cliente: dos } = crearCliente('tel-B');

    for (const [c, sid] of [
      [uno, 'a1'],
      [dos, 'b2'],
    ] as const) {
      await c.conectar('127.0.0.1', host.puerto);
      await esperar(c, 'bienvenida');
      c.reclamar(sid);
      await esperar(c, 'identidad');
    }

    const rondaUno = esperar(uno, 'ronda');
    const rondaDos = esperar(dos, 'ronda');
    host.iniciarRonda({ count: 4, duracionMs: 60_000 });

    const [a, b] = await Promise.all([rondaUno, rondaDos]);
    expect(a.items.map((i) => i.id)).toEqual(b.items.map((i) => i.id));
    expect(a.items).toHaveLength(4);
  });

  it('el que llega tarde se engancha a la ronda en curso', async () => {
    const { host } = await levantarHost();
    const { cliente: temprano } = crearCliente('tel-A');
    await temprano.conectar('127.0.0.1', host.puerto);
    await esperar(temprano, 'bienvenida');
    temprano.reclamar('a1');
    await esperar(temprano, 'identidad');

    const primera = esperar(temprano, 'ronda');
    host.iniciarRonda({ count: 4, duracionMs: 60_000 });
    const esperada = await primera;

    const { cliente: tarde } = crearCliente('tel-B');
    await tarde.conectar('127.0.0.1', host.puerto);
    await esperar(tarde, 'bienvenida');
    const suRonda = esperar(tarde, 'ronda');
    tarde.reclamar('b2');

    expect((await suRonda).items.map((i) => i.id)).toEqual(esperada.items.map((i) => i.id));
  });

  it('el marcador del host refleja lo que responden los estudiantes', async () => {
    const { host } = await levantarHost();
    const { cliente } = crearCliente('tel-A');
    await cliente.conectar('127.0.0.1', host.puerto);
    await esperar(cliente, 'bienvenida');
    cliente.reclamar('a1');
    await esperar(cliente, 'identidad');

    const ronda = esperar(cliente, 'ronda');
    host.iniciarRonda({ count: 4, duracionMs: 60_000 });
    const { items } = await ronda;

    cliente.responder({ item: items[0]!, packId: packDemo.id, correct: true, ms: 900 });
    cliente.responder({ item: items[1]!, packId: packDemo.id, correct: false, ms: 3000 });
    cliente.sincronizar();
    await respirar(150);

    expect(host.sesion.marcador.a1).toMatchObject({ answered: 2, correct: 1 });
  });

  it('el marcador no cuenta dos veces si el push se repite', async () => {
    const { host } = await levantarHost();
    const { cliente } = crearCliente('tel-A');
    await cliente.conectar('127.0.0.1', host.puerto);
    await esperar(cliente, 'bienvenida');
    cliente.reclamar('a1');
    await esperar(cliente, 'identidad');

    const ronda = esperar(cliente, 'ronda');
    host.iniciarRonda({ count: 4, duracionMs: 60_000 });
    const { items } = await ronda;

    cliente.responder({ item: items[0]!, packId: packDemo.id, correct: true, ms: 900 });
    for (let i = 0; i < 4; i++) cliente.sincronizar();
    await respirar(200);

    expect(host.sesion.marcador.a1).toMatchObject({ answered: 1, correct: 1 });
  });

  it('el semáforo pone arriba al que va más atrás', async () => {
    const { host } = await levantarHost();
    const clientes = await Promise.all(
      (['a1', 'b2', 'c3'] as const).map(async (sid, i) => {
        const { cliente } = crearCliente(`tel-${i}`);
        await cliente.conectar('127.0.0.1', host.puerto);
        await esperar(cliente, 'bienvenida');
        cliente.reclamar(sid);
        await esperar(cliente, 'identidad');
        return cliente;
      }),
    );

    const rondas = clientes.map((c) => esperar(c, 'ronda'));
    host.iniciarRonda({ count: 4, duracionMs: 60_000 });
    const items = (await rondas[0]!).items;
    await Promise.all(rondas);

    // Ana y Beto resuelven cuatro; Carla apenas uno.
    for (const c of [clientes[0]!, clientes[1]!]) {
      for (const item of items) c.responder({ item, packId: packDemo.id, correct: true, ms: 800 });
    }
    clientes[2]!.responder({ item: items[0]!, packId: packDemo.id, correct: true, ms: 800 });
    for (const c of clientes) c.sincronizar();
    await respirar(250);

    const filas = host.semaforo();
    expect(filas[0]?.studentId).toBe('c3');
    expect(filas[0]?.semaforo).toBe('rojo');
  });
});

describe('sincronización sobre la red', () => {
  it('lo respondido llega al host y deja de estar pendiente', async () => {
    const { host, log: logHost } = await levantarHost();
    const { cliente } = crearCliente('tel-A');
    await cliente.conectar('127.0.0.1', host.puerto);
    await esperar(cliente, 'bienvenida');
    cliente.reclamar('a1');
    await esperar(cliente, 'identidad');

    const ronda = esperar(cliente, 'ronda');
    host.iniciarRonda({ count: 4, duracionMs: 60_000 });
    const { items } = await ronda;

    for (const item of items) {
      cliente.responder({ item, packId: packDemo.id, correct: true, ms: 700 });
    }
    expect(cliente.pendientes).toBe(4);

    cliente.sincronizar();
    await respirar(200);

    expect(cliente.pendientes).toBe(0);
    expect(logHost.all('a1')).toHaveLength(4);
    expect(cliente.estado.correct).toBe(4);
  });

  it('sincronizar de más no duplica nada', async () => {
    const { host, log: logHost } = await levantarHost();
    const { cliente } = crearCliente('tel-A');
    await cliente.conectar('127.0.0.1', host.puerto);
    await esperar(cliente, 'bienvenida');
    cliente.reclamar('a1');
    await esperar(cliente, 'identidad');

    const ronda = esperar(cliente, 'ronda');
    host.iniciarRonda({ count: 4, duracionMs: 60_000 });
    const { items } = await ronda;
    cliente.responder({ item: items[0]!, packId: packDemo.id, correct: true, ms: 700 });

    for (let i = 0; i < 5; i++) cliente.sincronizar();
    await respirar(200);

    expect(logHost.all('a1')).toHaveLength(1);
    expect(cliente.estado.answered).toBe(1);
  });

  it('a quien se le cortó el wifi no lo marca atrasado al volver', async () => {
    // Regresión: el marcador vivo se alimentaba de un aviso aparte que se
    // perdía al desconectarse, así que un teléfono con un parpadeo de señal
    // aparecía en rojo aunque el niño hubiera respondido todo.
    const { host } = await levantarHost();
    const { cliente } = crearCliente('tel-A');
    await cliente.conectar('127.0.0.1', host.puerto);
    await esperar(cliente, 'bienvenida');
    cliente.reclamar('a1');
    await esperar(cliente, 'identidad');

    const ronda = esperar(cliente, 'ronda');
    host.iniciarRonda({ count: 4, duracionMs: 60_000 });
    const { items } = await ronda;

    cliente.desconectar();
    await respirar(80);
    for (const item of items) {
      cliente.responder({ item, packId: packDemo.id, correct: true, ms: 700 });
    }
    expect(host.sesion.marcador.a1?.answered ?? 0).toBe(0);

    await cliente.conectar('127.0.0.1', host.puerto);
    await esperar(cliente, 'identidad');
    await respirar(250);

    expect(host.sesion.marcador.a1).toMatchObject({ answered: 4, correct: 4 });
    expect(host.semaforo().find((f) => f.studentId === 'a1')?.semaforo).toBe('verde');
  });

  it('el niño cambia de teléfono y encuentra su progreso', async () => {
    const { host, log: logHost } = await levantarHost();

    // Teléfono prestado de hoy.
    const { cliente: hoy } = crearCliente('tel-A');
    await hoy.conectar('127.0.0.1', host.puerto);
    await esperar(hoy, 'bienvenida');
    hoy.reclamar('a1');
    await esperar(hoy, 'identidad');

    const ronda = esperar(hoy, 'ronda');
    host.iniciarRonda({ count: 4, duracionMs: 60_000 });
    const { items } = await ronda;
    for (const item of items) {
      hoy.responder({ item, packId: packDemo.id, correct: true, ms: 700 });
    }
    hoy.sincronizar();
    await respirar(200);

    const estadoDeHoy = hoy.estado;
    expect(estadoDeHoy.correct).toBe(4);
    expect(logHost.all('a1')).toHaveLength(4);
    hoy.desconectar();
    await respirar(80);

    // Mañana, otro teléfono, con el log completamente vacío.
    const { cliente: manana, log: logNuevo } = crearCliente('tel-Z');
    expect(logNuevo.all('a1')).toHaveLength(0);

    await manana.conectar('127.0.0.1', host.puerto);
    await esperar(manana, 'bienvenida');
    const identidad = esperar(manana, 'identidad');
    manana.reclamar('a1');
    const recuperado = await identidad;

    expect(recuperado.estado.correct).toBe(estadoDeHoy.correct);
    expect(recuperado.estado.answered).toBe(estadoDeHoy.answered);
    expect(recuperado.estado.xp).toBe(estadoDeHoy.xp);
  });

  it('lo respondido sin conexión viaja cuando vuelve la señal', async () => {
    const { host, log: logHost } = await levantarHost();
    const { cliente, log: logCliente } = crearCliente('tel-A');
    await cliente.conectar('127.0.0.1', host.puerto);
    await esperar(cliente, 'bienvenida');
    cliente.reclamar('a1');
    await esperar(cliente, 'identidad');

    const ronda = esperar(cliente, 'ronda');
    host.iniciarRonda({ count: 4, duracionMs: 60_000 });
    const { items } = await ronda;

    // Se cae el wifi a mitad de ronda.
    cliente.desconectar();
    await respirar(80);

    for (const item of items) {
      cliente.responder({ item, packId: packDemo.id, correct: true, ms: 700 });
    }
    // El niño siguió jugando: el progreso está en su teléfono, no en el host.
    expect(logCliente.pending('a1')).toHaveLength(4);
    expect(logHost.all('a1')).toHaveLength(0);
    expect(cliente.estado.correct).toBe(4);

    // Vuelve la señal.
    await cliente.conectar('127.0.0.1', host.puerto);
    await esperar(cliente, 'identidad');
    await respirar(250);

    expect(logHost.all('a1')).toHaveLength(4);
    expect(cliente.pendientes).toBe(0);
  });
});
