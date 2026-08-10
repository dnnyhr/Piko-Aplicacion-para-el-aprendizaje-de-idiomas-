/**
 * La sala de juego del estudiante.
 *
 * Tres momentos: esperando que el maestro arranque, jugando, y el resumen de
 * la ronda. Si el wifi se cae a mitad de camino, la pantalla lo dice pero
 * **no** interrumpe el juego: las respuestas se siguen guardando y viajan
 * solas cuando vuelve la señal.
 */

import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Boton } from '../../src/ui/components/Boton';
import { Globo } from '../../src/ui/components/Globo';
import { Pantalla } from '../../src/ui/components/Pantalla';
import { PikoMascota } from '../../src/ui/piko/PikoMascota';
import { ESPERANDO, FIN_BIEN, FIN_NORMAL, elegir } from '../../src/ui/piko/frases';
import { Runner, type ResultadoRonda } from '../../src/features/exercises/Runner';
import { useAulaCliente } from '../../src/features/aula/cliente';
import { useProgreso } from '../../src/features/progreso/store';
import { color, espacio, radio, texto } from '../../src/ui/tokens';

export default function Jugar() {
  const router = useRouter();
  const { items, roster, studentId, conexion, board, reintentaEnMs } = useAulaCliente();
  const responder = useAulaCliente((s) => s.responder);
  const limpiarRonda = useAulaCliente((s) => s.limpiarRonda);
  const salir = useAulaCliente((s) => s.salir);
  const estado = useProgreso((s) => s.estado);

  const [resultado, setResultado] = useState<ResultadoRonda | null>(null);

  const yo = roster.find((r) => r.id === studentId);

  // Cada ronda nueva borra el resumen de la anterior.
  useEffect(() => {
    if (items) setResultado(null);
  }, [items]);

  // Si se perdió la identidad (p. ej. el maestro cerró la sala), se vuelve.
  useEffect(() => {
    if (!studentId) router.replace('/estudiante/unirse');
  }, [studentId, router]);

  const desconectado = conexion === 'caido';

  if (items && !resultado) {
    return (
      <View style={styles.raiz}>
        {desconectado && (
          <View style={styles.cintaCaida}>
            <Text style={styles.cintaTexto}>
              Sin señal — seguí jugando, se guarda todo
              {reintentaEnMs ? ` · reintento en ${Math.round(reintentaEnMs / 1000)} s` : ''}
            </Text>
          </View>
        )}
        <Runner
          items={items}
          onResponder={(item, acerto, ms) => responder(item, item.skill, acerto, ms)}
          onTerminar={setResultado}
        />
      </View>
    );
  }

  if (resultado) {
    const bien = resultado.aciertos / Math.max(1, resultado.respondidas) >= 0.7;
    const miFila = board.find((b) => b.studentId === studentId);

    return (
      <Pantalla>
        <ScrollView contentContainerStyle={styles.fin} showsVerticalScrollIndicator={false}>
          <PikoMascota estado={bien ? 'celebrando' : 'alegre'} tam={170} />
          <Globo hacia="abajo">{bien ? elegir(FIN_BIEN) : elegir(FIN_NORMAL)}</Globo>

          <View style={styles.marcador}>
            <Dato valor={`${resultado.aciertos}/${resultado.respondidas}`} etiqueta="Esta ronda" />
            <Dato valor={String(estado.xp)} etiqueta="XP total" />
            <Dato valor={String(miFila?.correct ?? estado.correct)} etiqueta="En la clase" />
          </View>

          {board.length > 1 && (
            <View style={styles.tabla}>
              <Text style={styles.instruccion}>Cómo va la clase</Text>
              {board.slice(0, 8).map((fila, i) => (
                <View
                  key={fila.studentId}
                  style={[styles.filaTabla, fila.studentId === studentId && styles.filaMia]}
                >
                  <Text style={styles.puesto}>{i + 1}</Text>
                  <Text style={styles.nombreTabla}>{fila.nombre}</Text>
                  <Text style={styles.cuentaTabla}>{fila.correct}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.esperando}>{elegir(ESPERANDO)}</Text>

          <Boton
            ancho
            tono="papel"
            onPress={() => {
              limpiarRonda();
              setResultado(null);
            }}
          >
            Esperar la próxima ronda
          </Boton>
        </ScrollView>
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <View style={styles.espera}>
        <PikoMascota estado={desconectado ? 'dormido' : 'idle'} tam={170} />
        <Globo hacia="abajo">
          {desconectado ? 'Se cortó la señal. Ya vuelvo a intentar.' : elegir(ESPERANDO)}
        </Globo>

        {yo && (
          <View style={styles.credencial}>
            <Text style={styles.credencialNombre}>{yo.nombre}</Text>
            <Text style={styles.credencialXp}>
              {estado.xp} XP · {estado.correct}/{estado.answered} correctas
            </Text>
          </View>
        )}

        <Boton
          ancho
          tono="fantasma"
          onPress={() => {
            salir();
            router.replace('/');
          }}
        >
          Salir de la clase
        </Boton>
      </View>
    </Pantalla>
  );
}

function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.datoValor}>{valor}</Text>
      <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: color.papel },
  cintaCaida: { backgroundColor: color.intentoFondo, paddingVertical: espacio.sm },
  cintaTexto: { ...texto.chico, color: color.intentoTinta, textAlign: 'center' },

  espera: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: espacio.lg },
  credencial: {
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: color.borde,
    borderRadius: radio.md,
    paddingVertical: espacio.md,
    paddingHorizontal: espacio.xl,
    alignItems: 'center',
  },
  credencialNombre: { ...texto.titulo, color: color.verde },
  credencialXp: { ...texto.chico, color: color.tintaSuave },

  fin: { alignItems: 'center', gap: espacio.lg, paddingBottom: espacio.xl },
  marcador: { flexDirection: 'row', gap: espacio.md },
  dato: {
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: color.borde,
    borderRadius: radio.md,
    paddingVertical: espacio.md,
    paddingHorizontal: espacio.lg,
    alignItems: 'center',
    minWidth: 92,
  },
  datoValor: { ...texto.titulo, color: color.verde },
  datoEtiqueta: { ...texto.chico, color: color.tintaSuave },

  tabla: { alignSelf: 'stretch', gap: espacio.xs },
  instruccion: {
    ...texto.chico,
    color: color.tintaSuave,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  filaTabla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: color.borde,
    borderRadius: radio.sm,
    paddingVertical: espacio.sm,
    paddingHorizontal: espacio.md,
  },
  filaMia: { borderColor: color.verdePasto, backgroundColor: color.aciertoFondo },
  puesto: { ...texto.chico, color: color.tintaSuave, width: 18 },
  nombreTabla: { ...texto.cuerpoFuerte, color: color.grafito, flex: 1 },
  cuentaTabla: { ...texto.cuerpoFuerte, color: color.verde },

  esperando: { ...texto.cuerpo, color: color.tintaSuave, textAlign: 'center' },
});
