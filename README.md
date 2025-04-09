# unplugin-import-adapter 🚀

**[English document](https://github.com/JsonLee12138/unplugin-import-adapter/blob/main/README.en.md)**

**自动提取 TypeScript 导出的工具库，专为 `unplugin-auto-import` 设计**。这个工具简化了在项目中自动导入组件、工具函数和其他模块导出的设置过程。


## 🌟 核心功能

- **自动发现**：无需手动配置，自动扫描TypeScript文件的命名导出
- **灵活适配**：支持包名/文件路径/别名转换/排除规则
- **生态兼容**：完美对接 `unplugin-auto-import` ，支持  `Vite` / `Webpack` / `Rollup`


## 📦 安装

```bash
# 包管理器任选其一
npm install -D unplugin-import-adapter
yarn add -D unplugin-import-adapter
pnpm add -D unplugin-import-adapter

# 注意：若遇ts-morph错误需单独安装
npm install -D ts-morph
```


## 🤔 为什么选择我们？

| 优势               | 说明                                 |
| ------------------ | ------------------------------------ |
| **🚀 节省90%时间**  | 自动提取导出，告别手动维护导入列表   |
| **🛡️ 减少人为错误** | 避免拼写错误和配置遗漏               |
| **🔄 实时同步更新** | 新增导出自动生效，无需重启开发服务器 |
| **🎛️ 高度可配置**   | 支持别名转换、灵活排除规则           |


## 🚦 快速开始

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
        // 场景1：自动导入本地组件库
        autoImport({
          pkgName: 'components',
          path: path.resolve(__dirname, './components/src/index.ts')
        }),

        // 场景2：处理第三方库（如radash）
        autoImport({
          pkgName: 'radash',
          alias: name => `_${name}_` // 转换为下划线包裹的别名
        }),

        // 场景3：处理UI框架（如antd）
        autoImport({
          pkgName: 'antd',
          alias: name => `Antd${name}` // 统一添加前缀
        })
      ],

      // 其他unplugin-auto-import配置
      eslintrc: { enabled: true },
      dts: 'src/auto-imports.d.ts'
    })
  ]
});
```


## 📖 API 参考

### `autoImport(options)`

**参数说明**：

| 选项       | 类型                       | 必填 | 默认值    | 描述                                       |
| ---------- | -------------------------- | ---- | --------- | ------------------------------------------ |
| `pkgName`  | `string`                   | ✅    | -         | 用于导入的包名（会自动解析到node_modules） |
| `path`     | `string`                   | ❌    | `pkgName` | 自定义文件路径（优先级高于pkgName）        |
| `alias`    | `(name: string) => string` | ❌    | -         | 导出名称转换函数                           |
| `excludes` | `(string \| RegExp)[]`     | ❌    | `[]`      | 排除列表（支持字符串精确匹配或正则表达式） |


## 🛠 故障排除指南

### 问题1：未找到导出项

1. 检查文件路径是否正确（建议使用绝对路径）
2. 确认文件包含**命名导出**（非默认导出）
3. 检查`excludes`配置是否错误匹配导出项

### 问题2：ts-morph错误

1. 确保已安装`ts-morph`作为开发依赖
2. 检查TypeScript版本（要求4.0+）

### 问题3：路径解析异常

```typescript
// 推荐使用双保险路径解析
path.resolve(__dirname, `node_modules/${pkgName}/dist/index.ts`)
```


## 🌐 兼容性

| 环境       | 支持情况                    |
| ---------- | --------------------------- |
| TypeScript | 4.0+                        |
| 打包工具   | Vite ✅  Webpack ✅  Rollup ✅ |
| 模块格式   | ESM ✅  CommonJS ✅           |


## 🤝 参与贡献

1. 提交Bug请附带复现步骤
2. 功能建议请先开Issue讨论
3. 提交PR前请确保测试用例通过


## 📄 许可证

MIT
