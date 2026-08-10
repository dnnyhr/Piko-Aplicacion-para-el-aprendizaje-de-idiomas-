/**
 * El panel del maestro.
 *
 * Todo lo que necesita ver de un vistazo: el código de la sala, cuántos se
 * conectaron, y quién va atrasado — un punto de color por estudiante, sin
 * gráficas ni porcentajes que nadie va a leer con treinta niños hablando.
 */

import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Boton } from '../../src/ui/components/Boton';
import { Pantalla } from '../../src/ui/components/Pantalla';
import { PikoMascota } from '../../src/ui/piko/PikoMascota';
import { color, espacio, radio, texto } from '../../src/ui/tokens';
import { useAnfitrion } from '../../src/features/aula/anfitrion';
import { abrirBase, guardarRoster, leerRoster } from '../../src/db';
import { PACKS } from '../../content';
import { PUERTO_AULA, type PresetSummary } from '../../src/core/protocol/messages';
import type { Semaforo } from '../../src/core/progress/rezago';

const PRESET_BASE: PresetSummary = {
  id: 'base',
  nombre: 'Inglés · todos los temas',
  lang: 'eng',
  themes: [],
  difficulty: 1,
  count: 8,
};

/** Lista de ejemplo, para poder abrir una sala sin haber importado nada. */
const EJEMPLO = [
  'Ana', 'Beto', 'Carla', 'Dario', 'Elena', 'Fabio',
  'Gabi', 'Hugo', 'Ivania', 'Josué', 'Karla', 'Luis',
];

const LUZ: Record<Semaforo, string> = {
  rojo: '#E4572E',
  ambar: color.pico,
  verde: color.verdePasto,
};

export default function PanelMaestro() {
  const router = useRouter();
  const { abierta, abriendo, error, roomCode, ip, conectados, sesion, semaforo } = useAnfitrion();
  const abrir = useAnfitrion((s) => s.abrir);
  const iniciarRonda = useAnfitrion((s) => s.iniciarRonda);
  const terminarRonda = useAnfitrion((s) => s.terminarRonda);
  const cerrar = useAnfitrion((s) => s.cerrar);

  const [roster, setRoster] = useState(() => leerRoster(abrirBase().sql));

  const nombres = useMemo(
    () => new Map(roster.map((a) => [a.id, a.nombre])),
    [roster],
  );

  const sembrarEjemplo = () => {
    const { sql } = abrirBase();
    guardarRoster(
      sql,
      EJEMPLO.map((nombre, i) => ({
        id: `demo-${i + 1}`,
        nombre,
        avatar: i % 6,
        grado: null,
      })),
    );
    setRoster(leerRoster(sql));
  };

  useEffect(() => () => void 0, []);

  const enRonda = sesion?.fase === 'ronda';

  return (
    <Pantalla>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <View style={styles.cabecera}>
          <PikoMascota estado={abierta ? 'idle' : 'dormido'} tam={80} />
          <View style={styles.cabeceraTexto}>
            <Text style={styles.titulo}>Mi clase</Text>
            <Text style={styles.sub}>
              {abierta ? `${conectados} conectado${conectados === 1 ? '' : 's'}` : 'Sala cerrada'}
            </Text>
          </View>
        </View>

        {!abierta && (
          <View style={styles.aviso}>
            <Text style={styles.avisoTitulo}>Antes de abrir la sala</Text>
            <Text style={styles.avisoTexto}>
              Encendé el <Text style={styles.negrita}>punto de acceso</Text> (hotspot) desde los
              ajustes de tu teléfono. Los estudiantes se conectan a esa red y ahí te encuentran.
              No hace falta que tengas datos ni internet.
            </Text>
          </View>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        {abierta && (
          <View style={styles.tarjetaSala}>
            <Text style={styles.etiquetaSala}>Código de la clase</Text>
            <Text style={styles.codigo}>{roomCode}</Text>
            {ip && (
              <Text style={styles.ip}>
                Si algún teléfono no encuentra la sala, que escriba {ip}:{PUERTO_AULA}
              </Text>
            )}
          </View>
        )}

        {roster.length === 0 ? (
          <View style={styles.vacio}>
            <Text style={styles.vacioTexto}>
              Todavía no cargaste la lista de tu clase.
            </Text>
            <Boton ancho tono="papel" onPress={sembrarEjemplo}>
              Usar una lista de ejemplo
            </Boton>
          </View>
        ) : (
          <View style={styles.lista}>
            <Text style={styles.instruccion}>
              {enRonda ? 'Cómo va la clase' : `${roster.length} estudiantes en la lista`}
            </Text>

            {semaforo.length > 0
              ? semaforo.map((fila) => (
                  <View key={fila.studentId} style={styles.fila}>
                    <View style={[styles.punto, { backgroundColor: LUZ[fila.semaforo] }]} />
                    <Text style={styles.nombre}>
                      {nombres.get(fila.studentId) ?? fila.studentId}
                    </Text>
                    <Text style={styles.cuenta}>
                      {fila.correct}/{fila.answered}
                    </Text>
                  </View>
                ))
              : roster.map((a) => (
                  <View key={a.id} style={styles.fila}>
                    <View style={[styles.punto, styles.puntoApagado]} />
                    <Text style={styles.nombre}>{a.nombre}</Text>
                    <Text style={styles.cuenta}>—</Text>
                  </View>
                ))}
          </View>
        )}

        <View style={styles.acciones}>
          {!abierta ? (
            <Boton
              ancho
              disabled={abriendo || roster.length === 0}
              onPress={() =>
                abrir({
                  packs: PACKS,
                  roster: roster.map((a) => ({ id: a.id, nombre: a.nombre, avatar: a.avatar })),
                  preset: PRESET_BASE,
                })
              }
            >
              {abriendo ? 'Abriendo…' : 'Abrir la sala'}
            </Boton>
          ) : enRonda ? (
            <Boton ancho tono="pico" onPress={terminarRonda}>
              Terminar la ronda
            </Boton>
          ) : (
            <Boton ancho onPress={() => iniciarRonda({ count: 8, duracionMs: 300_000 })}>
              Empezar una ronda
            </Boton>
          )}

          {abierta && (
            <Boton ancho tono="papel" onPress={() => void cerrar()}>
              Cerrar la sala
            </Boton>
          )}

          <Boton ancho tono="fantasma" onPress={() => router.back()}>
            Volver
          </Boton>
        </View>
      </ScrollView>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: espacio.lg, paddingBottom: espacio.xl },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espacio.md },
  cabeceraTexto: { flex: 1 },
  titulo: { ...texto.display, color: color.verde },
  sub: { ...texto.cuerpo, color: color.tintaSuave },

  aviso: {
    backgroundColor: color.nube,
    borderRadius: radio.md,
    padding: espacio.lg,
    gap: espacio.xs,
  },
  avisoTitulo: { ...texto.cuerpoFuerte, color: '#0B3D57' },
  avisoTexto: { ...texto.cuerpo, color: '#0B3D57' },
  negrita: { fontFamily: 'NunitoSans_700Bold' },
  error: { ...texto.cuerpo, color: color.copete },

  tarjetaSala: {
    backgroundColor: color.verde,
    borderRadius: radio.lg,
    padding: espacio.lg,
    alignItems: 'center',
    gap: espacio.xs,
  },
  etiquetaSala: { ...texto.etiqueta, color: color.verdePasto },
  codigo: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 52,
    lineHeight: 58,
    letterSpacing: 6,
    color: color.papel,
  },
  ip: { ...texto.chico, color: '#BFD9C9', textAlign: 'center' },

  vacio: { gap: espacio.md, alignItems: 'center' },
  vacioTexto: { ...texto.cuerpo, color: color.tintaSuave, textAlign: 'center' },

  lista: { gap: espacio.sm },
  instruccion: {
    ...texto.chico,
    color: color.tintaSuave,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: color.borde,
    borderRadius: radio.md,
    paddingVertical: espacio.md,
    paddingHorizontal: espacio.lg,
  },
  punto: { width: 14, height: 14, borderRadius: 7 },
  puntoApagado: { backgroundColor: color.bordeHondo },
  nombre: { ...texto.cuerpoFuerte, color: color.grafito, flex: 1 },
  cuenta: { ...texto.cuerpo, color: color.tintaSuave },

  acciones: { gap: espacio.md, marginTop: espacio.sm },
});
