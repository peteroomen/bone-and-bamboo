import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

// The rules engine, content and simulator must stay pure: no DOM, no UI imports,
// no wall-clock time and no unseeded randomness. These rules make that a lint error
// rather than a convention.
const purityRestrictions = {
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        {
          group: ['@/ui', '@/ui/*', '../ui/*', '../../ui/*'],
          message: 'Engine code must not import UI.',
        },
        { group: ['react', 'react-dom', 'react/*'], message: 'Engine code must not import React.' },
      ],
    },
  ],
  'no-restricted-globals': [
    'error',
    { name: 'window', message: 'Engine code must not touch the DOM.' },
    { name: 'document', message: 'Engine code must not touch the DOM.' },
    { name: 'navigator', message: 'Engine code must not touch the DOM.' },
    { name: 'localStorage', message: 'Engine code must not touch storage.' },
  ],
  'no-restricted-properties': [
    'error',
    { object: 'Math', property: 'random', message: 'Use the seeded RNG in @/engine/rng.' },
    { object: 'Date', property: 'now', message: 'Engine code must be deterministic.' },
    { object: 'performance', property: 'now', message: 'Engine code must be deterministic.' },
  ],
  'no-restricted-syntax': [
    'error',
    {
      selector: "NewExpression[callee.name='Date']",
      message: 'Engine code must be deterministic.',
    },
  ],
};

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dev-dist',
      'node_modules',
      'coverage',
      'test-results',
      'playwright-report',
      'sim-out',
      'art-source',
      'tools',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.browser },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['src/ui/**/*.{ts,tsx}', 'src/main.tsx'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['src/engine/**/*.ts', 'src/content/**/*.ts'],
    languageOptions: { globals: {} },
    rules: purityRestrictions,
  },
  {
    files: ['src/sim/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      ...purityRestrictions,
      // The simulator is a CLI: printing is its job, and timing its own runs is fine.
      'no-console': 'off',
      'no-restricted-globals': purityRestrictions['no-restricted-globals'],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded RNG in @/engine/rng.' },
      ],
      'no-restricted-syntax': 'off',
    },
  },
  {
    files: ['scripts/**/*.{ts,js,mjs}', 'e2e/**/*.ts', '*.config.{ts,js}'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-console': 'off' },
  },
);
