import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTipografias } from '../src/ui/fuentes';
import { useColor } from '../src/ui/tema';

// La splash se mantiene hasta que las tipografías están listas: si no, el
// primer cuadro se vería con la fuente del sistema y saltaría.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function Layout() {
  const listas = useTipografias();
  const color = useColor();

  useEffect(() => {
    if (listas) SplashScreen.hideAsync().catch(() => undefined);
  }, [listas]);

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
    </SafeAreaProvider>
  );
}
