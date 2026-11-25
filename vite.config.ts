import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativo: sirve igual en GitHub Pages (/taro/) y dentro de la app de Capacitor.
export default defineConfig({ base: './', plugins: [react()] });
