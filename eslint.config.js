import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules',
      'dist',
      'build',
      'coverage',
      '.next',
      '.nuxt',
      'docs-site/build',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      'no-unused-vars': 'off', // Disable base rule as it conflicts with @typescript-eslint version
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-undef': 'off', // TypeScript handles this better
    },
  },
  {
    // Utility scripts are not application code — relax stylistic rules
    files: ['scripts/**/*.cjs', 'scripts/**/*.js'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
      'no-var': 'off',
      'prefer-const': 'off',
      'no-case-declarations': 'off',
      'no-useless-escape': 'off',
    },
  },
];
