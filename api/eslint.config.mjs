// @ts-check
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import eslint from '@eslint/js';
import eslintPluginImport from 'eslint-plugin-import';
import eslintPluginUnusedImports from 'eslint-plugin-unused-imports';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tsconfigPath = resolve(__dirname, 'tsconfig.json');

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/**', 'build/**', 'coverage/**', 'node_modules/**'],
  },

  eslint.configs.recommended,

  // ✅ LIGHT (sin type-check): esto NO construye el TS program gigante
  ...tseslint.configs.recommended,

  {
    plugins: {
      import: eslintPluginImport,
      'unused-imports': eslintPluginUnusedImports,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: [tsconfigPath],
          tsconfigRootDir: __dirname,
        },
        node: true,
      },
    },
  },

  eslintPluginPrettierRecommended,

  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
    },
  },

  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',

      // Limpieza pro
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-unused-vars': 'off',

      // Orden pro en imports
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-duplicates': 'warn',
      'import/first': 'warn',
      'import/newline-after-import': 'warn',

      // Type imports consistentes (no requiere type-check)
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],

      // Prettier
      'prettier/prettier': ['error', { endOfLine: 'lf' }],
    },
  },
);
