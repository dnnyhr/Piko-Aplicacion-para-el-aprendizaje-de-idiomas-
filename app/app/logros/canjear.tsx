/**
 * Canjear el código de una tarjeta de logro especial.
 *
 * El código se ordena solo mientras se escribe (mayúsculas y guiones, como en
 * la tarjeta). Si el servidor lo confirma, el logro queda en el progreso y
 * aparece la celebración; si no, se explica qué pasó sin regañar: los avisos
 * van en ámbar, nunca en rojo.
 */

import { useState } from 'react';
import { ActivityIndicator, Animated, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Boton } from '../../src/ui/components/Boton';
import { Globo } from '../../src/ui/components/Globo';
import { Pantalla } from '../../src/ui/components/Pantalla';
import { PikoMascota } from '../../src/ui/piko/PikoMascota';
import { Insignia } from '../../src/ui/logros/Insignia';
import { Rayos, useEntrada } from '../../src/ui/logros/Festejo';
import { fechaLarga } from '../../src/ui/logros/fecha';
import { useTextos } from '../../src/ui/textos/useTextos';
import { canjearCodigo, type ResultadoCanje } from '../../src/features/logros/canje';
import { useProgreso } from '../../src/features/progreso/store';
import { useAulaCliente } from '../../src/features/aula/cliente';
import { formatearMientrasEscribe, normalizarCodigo } from '../../src/core/logros/codigo';
import { logroPorId } from '../../src/core/logros/catalogo';
import type { Clave } from '../../src/ui/textos/traducir';
import { color, espacio, fuente, radio, texto } from '../../src/ui/tokens';

const AVISOS: Partial<Record<ResultadoCanje['tipo'], Clave>> = {
  invalido: 'canje.invalido',
  usado: 'canje.usado',
  ya_lo_tenes: 'canje.ya_lo_tenes',
  sin_internet: 'canje.sin_internet',
  bloqueado: 'canje.bloqueado',
  actualizar: 'canje.actualizar',
  error: 'canje.error',
};

export default function Canjear() {
  const router = useRouter();
  const { t } = useTextos();
  const nombre = useAulaCliente((s) => s.roster.find((r) => r.id === s.studentId)?.nombre ?? null);
  const [codigo, setCodigo] = useState('');
  const [revisando, setRevisando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoCanje | null>(null);

  const completo = normalizarCodigo(codigo) !== null;

  const canjear = async () => {
    if (revisando) return;
    setRevisando(true);
    setResultado(null);
    try {
      setResultado(await canjearCodigo(codigo, nombre));
    } finally {
      setRevisando(false);
    }
  };

  if (resultado?.tipo === 'ok') return <Exito logroId={resultado.logro} onOtro={() => (setCodigo(''), setResultado(null))} />;

  const aviso = resultado ? AVISOS[resultado.tipo] : undefined;

  return (
    <Pantalla>
      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <View style={styles.saludo}>
          <PikoMascota estado={aviso ? 'animando' : 'pensando'} tam={130} />
          <Globo style={styles.globo}>{t('canje.titulo')}</Globo>
        </View>

        <Text style={styles.ayuda}>{t('canje.ayuda')}</Text>

        <View style={styles.tarjeta}>
          <Text style={styles.tarjetaMarca}>🎟️ PIKO</Text>
          <TextInput
            value={codigo}
            onChangeText={(v) => {
              setCodigo(formatearMientrasEscribe(v));
              if (resultado) setResultado(null);
            }}
            placeholder={t('canje.placeholder')}
            placeholderTextColor={color.tintaSuave}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            maxLength={19}
            returnKeyType="done"
            onSubmitEditing={completo ? canjear : undefined}
            style={styles.campo}
            accessibilityLabel={t('canje.placeholder')}
          />
          <Text style={styles.ejemplo}>PIKO-HK26-XXXX-XXXX</Text>
        </View>

        {aviso && resultado && (
          <View style={styles.aviso} accessibilityLiveRegion="polite">
            <Text style={styles.avisoTexto}>{t(aviso, { minutos: resultado.tipo === 'bloqueado' ? resultado.minutos : 15 })}</Text>
          </View>
        )}

        {revisando ? (
          <View style={styles.revisando}>
            <ActivityIndicator color={color.verde} />
            <Text style={styles.revisandoTexto}>{t('canje.revisando')}</Text>
          </View>
        ) : (
          <Boton ancho tono="pico" disabled={!completo} onPress={canjear}>
            {t('canje.boton')}
          </Boton>
        )}

        <Boton ancho tono="fantasma" onPress={() => router.back()}>
          {t('comun.volver')}
        </Boton>
      </ScrollView>
    </Pantalla>
  );
}

/** Lo que queda en pantalla después del canje (la celebración sale encima). */
function Exito({ logroId, onOtro }: { logroId: string; onOtro: () => void }) {
  const router = useRouter();
  const { t } = useTextos();
  const entrada = useEntrada();
  const fecha = useProgreso((s) => s.estado.logros[logroId]);
  const logro = logroPorId(logroId);
  if (!logro) return null;

  return (
    <Pantalla fondo="#0B3D6E">
      <ScrollView contentContainerStyle={[styles.contenido, styles.exito]}>
        <Text style={styles.exitoTitulo}>{t('canje.lo_lograste')}</Text>
        <View style={styles.escena}>
          <View style={styles.rayos}>
            <Rayos tam={240} color="#7FC4FF" />
          </View>
          <Animated.View style={entrada}>
            <Insignia logro={logro} desbloqueado tam={150} />
          </Animated.View>
        </View>
        {logro.exclusivo && (
          <View style={styles.exclusivo}>
            <Text style={styles.exclusivoTexto}>⭐ {t('logros.exclusivo')}</Text>
          </View>
        )}
        <Text style={styles.exitoNombre}>{logro.nombre}</Text>
        <Text style={styles.exitoTexto}>{logro.felicitacion}</Text>
        <Text style={styles.exitoTexto}>«{logro.descripcion}»</Text>
        {fecha !== undefined && <Text style={styles.exitoFecha}>🗓️ {t('canje.obtenido', { fecha: fechaLarga(fecha) })}</Text>}
        <PikoMascota estado="celebrando" tam={120} />
        <Boton ancho tono="pico" onPress={() => router.replace('/logros')}>
          {t('logros.ver')}
        </Boton>
        <Boton ancho tono="fantasma" onPress={onOtro}>
          {t('canje.otro')}
        </Boton>
      </ScrollView>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: espacio.lg, paddingBottom: espacio.xl, maxWidth: 520, width: '100%', alignSelf: 'center' },
  saludo: { flexDirection: 'row', alignItems: 'center' },
  globo: { flex: 1, marginLeft: espacio.sm },
  ayuda: { ...texto.cuerpo, color: color.tinta },

  tarjeta: {
    backgroundColor: '#0B3D6E',
    borderRadius: radio.lg,
    borderWidth: 3,
    borderColor: '#F4C542',
    padding: espacio.lg,
    gap: espacio.sm,
  },
  tarjetaMarca: { ...texto.etiqueta, color: '#F4C542' },
  campo: {
    backgroundColor: color.blanco,
    borderRadius: radio.md,
    paddingVertical: espacio.md,
    paddingHorizontal: espacio.md,
    fontFamily: fuente.tituloFuerte,
    fontSize: 20,
    letterSpacing: 1.5,
    color: color.grafito,
    textAlign: 'center',
  },
  ejemplo: { ...texto.chico, color: '#BFD9F2', textAlign: 'center', letterSpacing: 1 },

  aviso: { backgroundColor: color.intentoFondo, borderColor: color.intento, borderWidth: 2, borderRadius: radio.md, padding: espacio.md },
  avisoTexto: { ...texto.cuerpoFuerte, color: color.intentoTinta },

  revisando: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: espacio.sm, paddingVertical: espacio.md },
  revisandoTexto: { ...texto.cuerpoFuerte, color: color.verde },

  exito: { alignItems: 'center' },
  exitoTitulo: { ...texto.display, color: '#F4C542', textAlign: 'center' },
  escena: { width: 240, height: 200, alignItems: 'center', justifyContent: 'center' },
  rayos: { position: 'absolute', left: 0, top: -20 },
  exclusivo: { backgroundColor: '#F4C542', borderRadius: radio.redondo, paddingHorizontal: espacio.md, paddingVertical: 2 },
  exclusivoTexto: { ...texto.etiqueta, color: '#5C3D02' },
  exitoNombre: { ...texto.titulo, color: '#FFFFFF', textAlign: 'center' },
  exitoTexto: { ...texto.cuerpo, color: '#DDF1FC', textAlign: 'center' },
  exitoFecha: { ...texto.cuerpoFuerte, color: '#F4C542' },
});
