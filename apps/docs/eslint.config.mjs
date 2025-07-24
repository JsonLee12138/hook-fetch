import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  unocss: true,
  react: true,
  typescript: true,
  stylistic: {
    indent: 2,
    quotes: "single",
    endOfLine: "lf",
    trailingComma: "all",
    semi: true,
  },
})
