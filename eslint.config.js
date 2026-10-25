import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Lo que la librería de física (src/fisica/) no puede tocar: la interfaz, el navegador y el azar sin semilla.
// Es la regla de separación del Avance 1 (sección 6.1): una violación rompe `pnpm lint` y el despliegue.
const NO_DEPENDER_DE_LA_INTERFAZ = {
  patterns: [
    { group: ['**/app', '**/app/**'], message: 'La librería de física no puede importar nada de la interfaz (src/app).' },
    { group: ['react', 'react/*', 'react-dom', 'react-dom/*'], message: 'La librería de física no puede depender de React.' },
    { group: ['uplot', 'uplot/*'], message: 'La librería de física no puede depender de la librería de gráficas.' },
    { group: ['node:*'], message: 'La librería de física no usa módulos de Node: es lógica pura.' },
  ],
};

const MENSAJE_GLOBAL = 'src/fisica/ no puede usar el navegador ni el reloj: es lógica pura y determinista.';
const GLOBALES_PROHIBIDOS = [
  'document', 'window', 'navigator', 'location', 'localStorage', 'sessionStorage',
  'HTMLElement', 'HTMLCanvasElement', 'requestAnimationFrame', 'cancelAnimationFrame',
  'setTimeout', 'setInterval', 'performance',
].map((name) => ({ name, message: MENSAJE_GLOBAL }));

export default defineConfig(
  { ignores: ['dist', 'node_modules', 'scripts'] },
  { linterOptions: { reportUnusedDisableDirectives: 'off' } },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    // Los nombres que empiezan con _ son descartes intencionales (p. ej. { dictamen: _d, ...resto }).
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
    },
  },
  {
    // Los textos usan espacios no separables entre el número y la unidad: no son un error.
    rules: { 'no-irregular-whitespace': ['error', { skipStrings: true, skipTemplates: true, skipComments: true, skipRegExps: true, skipJSXText: true }] },
  },
  {
    files: ['src/app/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'warn' },
  },
  {
    files: ['src/fisica/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', NO_DEPENDER_DE_LA_INTERFAZ],
      'no-restricted-globals': ['error', ...GLOBALES_PROHIBIDOS],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Sin aleatoriedad en la librería (salvo con semilla explícita).' },
        { object: 'Date', property: 'now', message: 'La librería no lee el reloj: el tiempo es el tiempo simulado.' },
      ],
    },
  },
);
