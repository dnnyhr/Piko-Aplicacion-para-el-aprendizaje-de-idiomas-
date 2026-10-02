/**
 * Unirse a la clase.
 *
 * Primero busca sola al maestro; si no lo encuentra, deja escribir la
 * dirección que el maestro tiene en pantalla. Después el estudiante toca su
 * propio nombre — no hay contraseñas ni cuentas, porque los niños de esta
 * aula no tienen correo.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Boton } from '../../src/ui/components/Boton';
import { Globo } from '../../src/ui/components/Globo';
import { Pantalla } from '../../src/ui/components/Pantalla';
import { PikoMascota } from '../../src/ui/piko/PikoMascota';
import { color, espacio, radio, texto } from '../../src/ui/tokens';
import { useAulaCliente } from '../../src/features/aula/cliente';
import { buscarAnfitrion, ipValida } from '../../src/net/descubrir';
import { hayRed, transporteDelDispositivo } from '../../src/net/transporte';
import { abrirBase, ultimoHost } from '../../src/db';
import { useTextos } from '../../src/ui/textos/useTextos';

export default function Unirse() {
  const router = useRouter();
  const { conexion, roster, roomCode, studentId, rechazo } = useAulaCliente();
  const conectar = useAulaCliente((s) => s.conectar);
  const reclamar = useAulaCliente((s) => s.reclamar);
  const salir = useAulaCliente((s) => s.salir);
  const { t } = useTextos();

  const [buscando, setBuscando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const [mostrarManual, setMostrarManual] = useState(false);
  const señal = useRef({ cancelado: false });

  const buscar = useCallback(async () => {
    if (!hayRed) {
      setMensaje(t('unirse.sin_red'));
      setBuscando(false);
      return;
    }

    señal.current = { cancelado: false };
    setBuscando(true);
    setMensaje(null);

    // Si ya jugó antes en esta aula, se prueba primero la última dirección.
    const { sql } = abrirBase();
    const conocida = ultimoHost(sql);
    const candidatas = conocida ? [conocida] : [];

    for (const ip of candidatas) {
      try {
        await conectar(ip);
        setBuscando(false);
        return;
      } catch {
        /* seguimos buscando */
      }
    }

    const encontrada = await buscarAnfitrion(transporteDelDispositivo(), {
      onProgreso: (paso) => setMensaje(t(paso === 'barrido' ? 'unirse.revisando_red' : 'unirse.buscando_maestro')),
      señal: señal.current,
    });

    if (!encontrada) {
      setBuscando(false);
      setMensaje(t('unirse.no_encontre'));
      setMostrarManual(true);
      return;
    }

    try {
      await conectar(encontrada);
    } catch {
      setMensaje(t('unirse.no_pude_entrar'));
      setMostrarManual(true);
    }
    setBuscando(false);
  }, [conectar, t]);

  useEffect(() => {
    if (conexion === 'suelto') void buscar();
    return () => {
      señal.current.cancelado = true;
    };
    // Sólo al montar: si se relanzara con cada cambio de conexión, un corte
    // de wifi dispararía búsquedas encimadas.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Con identidad reclamada, se pasa a la sala de juego.
  useEffect(() => {
    if (studentId) router.replace('/estudiante/jugar');
  }, [studentId, router]);

  const conectarManual = async () => {
    if (!ipValida(manual)) {
      setMensaje(t('unirse.ip_invalida'));
      return;
    }
    setMensaje(null);
    try {
      await conectar(manual.trim());
    } catch {
      setMensaje(t('unirse.sin_respuesta'));
    }
  };

  const conectado = conexion === 'conectado';

  return (
    <Pantalla>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <View style={styles.cabecera}>
          <PikoMascota estado={conectado ? 'alegre' : 'pensando'} tam={110} />
          <Globo style={styles.globo}>
            {conectado
              ? t('unirse.entraste', { codigo: roomCode ?? '' })
              : (mensaje ?? t('unirse.buscando_maestro'))}
          </Globo>
        </View>

        {rechazo && <Text style={styles.error}>{rechazo}</Text>}

        {conectado ? (
          <View style={styles.rejilla}>
            {roster.map((alumno) => (
              <Pressable
                key={alumno.id}
                onPress={() => !alumno.tomado && reclamar(alumno.id)}
                disabled={alumno.tomado}
                style={[styles.alumno, alumno.tomado && styles.alumnoTomado]}
                accessibilityRole="button"
              >
                <Text style={[styles.alumnoNombre, alumno.tomado && styles.alumnoNombreTomado]}>
                  {alumno.nombre}
                </Text>
                {alumno.tomado && <Text style={styles.tomado}>{t('unirse.ya_esta_jugando')}</Text>}
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.acciones}>
            <Boton ancho disabled={buscando} onPress={() => void buscar()}>
              {t(buscando ? 'unirse.buscando' : 'unirse.buscar_otra_vez')}
            </Boton>

            {mostrarManual && (
              <View style={styles.manual}>
                <Text style={styles.instruccion}>{t('unirse.escribi_direccion')}</Text>
                <TextInput
                  value={manual}
                  onChangeText={setManual}
                  placeholder="192.168.43.1"
                  placeholderTextColor={color.tintaSuave}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.entrada}
                />
                <Boton ancho tono="cielo" onPress={() => void conectarManual()}>
                  {t('unirse.entrar')}
                </Boton>
              </View>
            )}
          </View>
        )}

        <Boton
          ancho
          tono="fantasma"
          onPress={() => {
            señal.current.cancelado = true;
            salir();
            router.back();
          }}
        >
          {t('comun.volver')}
        </Boton>
      </ScrollView>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: espacio.xl, paddingBottom: espacio.xl },
  cabecera: { flexDirection: 'row', alignItems: 'center' },
  globo: { flex: 1, marginLeft: espacio.sm },
  error: { ...texto.cuerpoFuerte, color: color.copete, textAlign: 'center' },

  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.md },
  alumno: {
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: color.borde,
    borderRadius: radio.md,
    paddingVertical: espacio.md,
    paddingHorizontal: espacio.lg,
    minWidth: '46%',
    flexGrow: 1,
    alignItems: 'center',
  },
  alumnoTomado: { backgroundColor: color.papelHondo, borderColor: color.papelHondo },
  alumnoNombre: { ...texto.subtitulo, color: color.grafito },
  alumnoNombreTomado: { color: color.tintaSuave },
  tomado: { ...texto.chico, color: color.tintaSuave },

  acciones: { gap: espacio.lg },
  manual: { gap: espacio.sm },
  instruccion: {
    ...texto.chico,
    color: color.tintaSuave,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  entrada: {
    ...texto.cuerpoFuerte,
    color: color.grafito,
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: color.borde,
    borderRadius: radio.md,
    paddingVertical: espacio.md,
    paddingHorizontal: espacio.lg,
  },
});
