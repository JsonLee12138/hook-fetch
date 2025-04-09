
# unplugin-import-adapter 🚀

**[中文文档](https://github.com/JsonLee12138/unplugin-import-adapter/blob/main/README.md)**

**A TypeScript export auto-extraction library designed for `unplugin-auto-import`**. Simplify the setup process of auto-importing components, utility functions, and other module exports in your project.


## 🌟 Core Features

- **Auto Discovery**: Automatically scan named exports from TypeScript files without manual configuration
- **Flexible Adaptation**: Support package name/file path/alias conversion/exclusion rules
- **Ecosystem Compatibility**: Perfectly integrate with `unplugin-auto-import`, works with `Vite`/`Webpack`/`Rollup`


## 📦 Installation

```bash
# Choose one package manager
npm install -D unplugin-import-adapter
yarn add -D unplugin-import-adapter
pnpm add -D unplugin-import-adapter

# Note: Install ts-morph separately if encountering errors
npm install -D ts-morph
```


## 🤔 Why Choose Us?

| Advantage                 | Description                                                       |
| ------------------------- | ----------------------------------------------------------------- |
| **🚀 Save 90% Time**       | Auto-extract exports,告别 manual import list maintenance          |
| **🛡️ Reduce Human Errors** | Avoid typos and configuration omissions                           |
| **🔄 Real-time Updates**   | New exports take effect immediately without restarting dev server |
| **🎛️ Highly Configurable** | Support alias conversion and flexible exclusion rules             |


## 🚦 Quick Start

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import AutoImport from 'unplugin-auto-import/vite';
import { autoImport } from 'unplugin-import-adapter';
import path from 'path';

export default defineConfig({
  plugins: [
    AutoImport({
      imports: [
        // Scenario 1: Auto-import local component library
        autoImport({
          pkgName: 'components',
          path: path.resolve(__dirname, './components/src/index.ts')
        }),

        // Scenario 2: Handle third-party libraries (e.g., radash)
        autoImport({
          pkgName: 'radash',
          alias: name => `_${name}_` // Convert to underscore-wrapped alias
        }),

        // Scenario 3: Handle UI frameworks (e.g., antd)
        autoImport({
          pkgName: 'antd',
          alias: name => `Antd${name}` // Add统一 prefix
        })
      ],

      // Other unplugin-auto-import configurations
      eslintrc: { enabled: true },
      dts: 'src/auto-imports.d.ts'
    })
  ]
});
```


## 📖 API Reference

### `autoImport(options)`

**Parameter Description**:

| Option     | Type                       | Required | Default   | Description                                              |
| ---------- | -------------------------- | -------- | --------- | -------------------------------------------------------- |
| `pkgName`  | `string`                   | ✅        | -         | Package name for imports (auto-resolves to node_modules) |
| `path`     | `string`                   | ❌        | `pkgName` | Custom file path (higher priority than pkgName)          |
| `alias`    | `(name: string) => string` | ❌        | -         | Export name conversion function                          |
| `excludes` | `(string \| RegExp)[]`     | ❌        | `[]`      | Exclusion list (supports exact string or regex)          |


## 🛠 Troubleshooting Guide

### Issue 1: No exports found

1. Check file path correctness (recommend absolute paths)
2. Ensure files contain **named exports** (not default exports)
3. Verify `excludes` configuration isn't mistakenly matching exports

### Issue 2: ts-morph error

1. Ensure `ts-morph` is installed as a dev dependency
2. Check TypeScript version (requires 4.0+)

### Issue 3: Path resolution issues

```typescript
// Recommended double-check path resolution
path.resolve(__dirname, `node_modules/${pkgName}/dist/index.ts`)
```


## 🌐 Compatibility

| Environment    | Support Status              |
| -------------- | --------------------------- |
| TypeScript     | 4.0+                        |
| Bundlers       | Vite ✅  Webpack ✅  Rollup ✅ |
| Module Formats | ESM ✅  CommonJS ✅           |


## 🤝 Contributing

1. Include reproduction steps when submitting bugs
2. Discuss feature proposals in Issues first
3. Ensure test cases pass before submitting PRs


## 📄 License

MIT
