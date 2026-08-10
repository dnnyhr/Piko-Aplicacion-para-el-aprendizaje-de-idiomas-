import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@core': r('./src/core'),
      '@': r('./src'),
    },
  },
  test: {
    // Sólo el núcleo puro y la capa de red sobre Node. Nada de React Native
    // corre acá: si una prueba necesita un dispositivo, está mal ubicada.
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
