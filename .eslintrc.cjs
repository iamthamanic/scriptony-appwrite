module.exports = {
  root: true,
  env: { browser: true, es2020: true, worker: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', '@typescript-eslint'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // Kritische Fehler behalten
    'no-unused-vars': 'off', // TypeScript übernimmt
    '@typescript-eslint/no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_'
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-undef': 'off', // Für Worker
    'no-undef': 'off', // Für Worker
    '@typescript-eslint/ban-ts-comment': 'warn',
    '@typescript-eslint/no-empty-function': 'warn',
  },
}
