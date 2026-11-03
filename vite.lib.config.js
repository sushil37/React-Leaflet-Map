import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const notice = readFileSync(new URL('./THIRD-PARTY-NOTICES.txt', import.meta.url), 'utf8');

export default defineConfig(({ mode }) => {
  const format = mode === 'standalone' ? 'iife' : 'es';
  return {
    publicDir: false,
    plugins: [{
      name: 'leaflet-credit',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'THIRD-PARTY-NOTICES.txt', source: notice });
      },
    }],
    build: {
      outDir: 'dist/lib',
      emptyOutDir: format === 'es',
      lib: {
        entry: 'src/map.js',
        name: 'LeafletMap',
        formats: [format],
        fileName: () => format === 'es' ? 'leaflet-map.js' : 'leaflet-map.global.js',
        cssFileName: 'leaflet-map',
      },
      rollupOptions: {
        external: format === 'es' ? ['leaflet'] : [],
        output: { banner: '/*! Built on Leaflet by Volodymyr Agafonkin and contributors. See THIRD-PARTY-NOTICES.txt. */' },
      },
    },
  };
});
