/**
 * El lugar de la lengua de señas, junto a las instrucciones y el vocabulario.
 *
 * Sólo aparece si está activado en «Mi forma de aprender». Mientras no haya un
 * recurso validado lo dice con honestidad: nunca muestra una seña improvisada.
 */

import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { recursosPara, type RecursoSena } from '../../core/senas/recurso';
import { usePreferencias } from '../preferencias/store';
import { crearEstilos } from '../../ui/tema';
import { espacio, radio, texto } from '../../ui/tokens';
import { useTextos } from '../../ui/textos/useTextos';
import { RECURSOS_SENAS } from '../../../content/senas';

export interface PanelSenasProps {
  /** Lo que se está mostrando: `instruccion.choice`, `vocabulario.<id>`… */
  claves: readonly string[];
  /**
   * Decir que todavía no hay video. Va en las instrucciones; en cada ejercicio
   * el aviso se repetiría de más, así que ahí sólo aparece si hay algo que ver.
   */
  avisar?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function PanelSenas({ claves, avisar = true, style }: PanelSenasProps) {
  const styles = useEstilos();
  const { t } = useTextos();
  const activa = usePreferencias((s) => s.senas);
  if (!activa) return null;

  const recursos = recursosPara(RECURSOS_SENAS, claves);
  if (recursos.length === 0) {
    if (!avisar) return null;
    return (
      <View style={[styles.vacio, style]}>
        <Text style={styles.vacioTexto}>{t('senas.pendiente')}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.lista, style]}>
      {recursos.map((r) => (
        <ReproductorSena key={r.id} recurso={r} />
      ))}
    </View>
  );
}

/**
 * El video. Hoy muestra su descripción escrita: `expo-video` se instala junto
 * con el primer recurso validado (ver `content/senas/README.md`).
 */
function ReproductorSena({ recurso }: { recurso: RecursoSena }) {
  const styles = useEstilos();
  return (
    <View style={styles.video}>
      <Text style={styles.videoTexto}>{recurso.descripcion}</Text>
    </View>
  );
}

const useEstilos = crearEstilos((color) => ({
  lista: { gap: espacio.sm },
  vacio: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: color.bordeHondo,
    borderRadius: radio.md,
    paddingVertical: espacio.sm,
    paddingHorizontal: espacio.md,
  },
  vacioTexto: { ...texto.chico, color: color.tinta },
  video: {
    minHeight: 120,
    justifyContent: 'center',
    backgroundColor: color.nube,
    borderRadius: radio.md,
    padding: espacio.md,
  },
  videoTexto: { ...texto.cuerpo, color: color.tinta },
}));
