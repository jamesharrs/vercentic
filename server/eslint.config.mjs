import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    // Ignore generated/legacy/cleanup files
    ignores: [
      'node_modules/**',
      '_cleanup/**',
      'data/**',
      'uploads/**',
    ],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        // Node.js built-ins
        require: 'readonly', module: 'readonly', exports: 'readonly',
        __dirname: 'readonly', __filename: 'readonly',
        process: 'readonly', console: 'readonly', Buffer: 'readonly',
        setTimeout: 'readonly', clearTimeout: 'readonly',
        setInterval: 'readonly', clearInterval: 'readonly',
        setImmediate: 'readonly', clearImmediate: 'readonly',
        URL: 'readonly', URLSearchParams: 'readonly',
        // Node 18+ globals
        fetch: 'readonly', FormData: 'readonly', Headers: 'readonly',
        Request: 'readonly', Response: 'readonly', ReadableStream: 'readonly',
        // Crypto
        crypto: 'readonly',
      },
    },
    rules: {
      // ── Errors: things that are definitely bugs ──────────────────────────
      'no-undef':               'error',
      'no-duplicate-case':      'error',
      'no-unreachable':         'error',
      'no-async-promise-executor': 'error',  // async inside new Promise() is always wrong
      'no-constant-condition':  'error',
      'no-self-assign':         'error',
      'use-isnan':              'error',     // if (x == NaN) never works

      // ── Warnings: code smells worth fixing over time ─────────────────────
      'no-unused-vars':   ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'prefer-const':     'warn',
      'no-var':           'warn',
      'eqeqeq':           ['warn', 'smart'],
      'require-await':    'warn',   // async fn with no await is likely a mistake

      // ── Off: too noisy for existing codebase ─────────────────────────────
      'no-empty':         'off',    // empty catch blocks are common
      'no-console':       'off',
      'no-param-reassign':'off',    // very common pattern in Express routes
    },
  },
  {
    // Test files get extra globals
    files: ['**/*.test.js', '**/__tests__/**/*.js', 'tests/**/*.js'],
    languageOptions: {
      globals: {
        describe: 'readonly', it: 'readonly', test: 'readonly',
        expect: 'readonly', beforeAll: 'readonly', afterAll: 'readonly',
        beforeEach: 'readonly', afterEach: 'readonly', jest: 'readonly',
      },
    },
  },
];
