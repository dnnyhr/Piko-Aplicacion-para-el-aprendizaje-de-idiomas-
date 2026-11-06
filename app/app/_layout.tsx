import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTipografias } from '../src/ui/fuentes';
import { useColor } from '../src/ui/tema';
import { useLogros } from '../src/features/logros/store';
import { CelebracionLogros } from '../src/ui/logros/Celebracion';

// La splash se mantiene hasta que las tipografías están listas: si no, el
// primer cuadro se vería con la fuente del sistema y saltaría.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function Layout() {
  const listas = useTipografias();
  const color = useColor();

  useEffect(() => {
    if (listas) SplashScreen.hideAsync().catch(() => undefined);
  }, [listas]);

  // Empieza a mirar el progreso para festejar los logros nuevos.
  useEffect(() => {
    useLogros.getState().preparar();
  }, []);

  if (!listas) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.papel },
          animation: 'slide_from_right',
        }}
      />
      <CelebracionLogros />
    </SafeAreaProvider>
  );
}
