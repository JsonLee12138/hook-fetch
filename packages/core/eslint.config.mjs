import antfu from '@antfu/eslint-config';

export default antfu({
  formatters: true,
  typescript: true,
  stylistic: {
    indent: 2,
    quotes: 'single',
    endOfLine: 'lf',
    trailingComma: 'all',
    semi: true,
  },
  rules: {
    'no-console': 'warn',
    'dot-notation': 'off',
  },
});
