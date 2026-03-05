import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist/**', 'build/**', 'node_modules/**', 'coverage/**', '.vite/**']),

  {
    files: ['**/*.{ts,tsx}'],

    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,

      // Reglas recomendadas de Hooks
      reactHooks.configs.flat.recommended,

      // Reglas recomendadas para React Refresh (Vite)
      reactRefresh.configs.vite,
    ],

    plugins: {
      import: importPlugin,
      'unused-imports': unusedImports,
    },

    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    rules: {
      // ✅ Reglas core de Hooks (siempre activas)
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // ✅ React Compiler rules — bajadas a warn porque el React Compiler (babel plugin)
      // NO está habilitado en este proyecto (vite.config.ts usa react() sin compiler).
      // Estas reglas son orientativas pero no bloquean el build.
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/component-hook-factories': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/globals': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/error-boundaries': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-render': 'warn',
      'react-hooks/gating': 'warn',
      'react-hooks/config': 'off',

      // ✅ React refresh (evita exports raros que rompen HMR)
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // ✅ Limpieza automática de imports
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
        },
      ],

      // ✅ Deshabilitado: en un frontend React con tests/mocks, `any` es inevitable
      // en adaptadores de APIs externas, mocks de vitest, y tipos de librerías sin tipos.
      '@typescript-eslint/no-explicit-any': 'off',

      // ✅ No-unused-vars delegado a unused-imports para evitar doble reporte
      '@typescript-eslint/no-unused-vars': 'off',

      // ✅ Orden de imports (opcional pero recomendado)
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
]);
