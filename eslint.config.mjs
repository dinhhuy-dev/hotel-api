import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['dist/**', 'coverage/**'],
  },

  {
    files: ['**/*.ts'],

    extends: [eslint.configs.recommended, tseslint.configs.recommendedTypeChecked],

    languageOptions: {
      globals: {
        ...globals.node,
      },

      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },

    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },

  {
    files: ['**/*.spec.ts', 'test/**/*.ts'],

    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },

  eslintConfigPrettier,
);
