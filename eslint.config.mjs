import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', 'packages/core/drizzle/**', 'data/**', '**/next-env.d.ts', 'apps/web/out/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Statische Launch-Seite: Skript läuft im Browser
    files: ['apps/launch/src/**/*.js'],
    languageOptions: {
      globals: { matchMedia: 'readonly', IntersectionObserver: 'readonly', Image: 'readonly' },
    },
  },
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
        Headers: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        AbortSignal: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        globalThis: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        document: 'readonly',
        window: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
    },
  },
);
