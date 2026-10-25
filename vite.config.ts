import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// `base` es la ruta del sitio en GitHub Pages: https://essanchezs.github.io/fun18-gravedad-artificial/
export default defineConfig({
  base: '/fun18-gravedad-artificial/',
  plugins: [react()],
});
