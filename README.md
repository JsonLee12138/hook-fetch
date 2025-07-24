# 🚀 Turbo Library Template

> 基于 Turbo、Rolldown、Docusaurus 的现代化工具库开发模板

[English](https://github.com/JsonLee12138/turborepo-lib-rolldown/blob/main/README.en.md) | 中文

## ✨ 特性

- 🏗️ **Monorepo 架构** - 基于 Turbo + pnpm 的高性能构建系统
- ⚡ **极速构建** - 使用 Rolldown 实现毫秒级构建体验
- 📚 **文档优先** - 集成 Docusaurus 3 的现代化文档站点
- 🔧 **完善工具链** - ESLint、OxLint、Prettier、TypeScript 开箱即用
- 📦 **多格式输出** - 自动生成 ESM、CJS、UMD 和类型声明文件
- 🔄 **版本管理** - 基于 Changesets 的自动化版本发布
- 🎯 **CI/CD 就绪** - GitHub Actions 配置完整的发布流程
- 💾 **Git 工作流** - Husky + Commitizen + Lint-staged 规范化提交

## 📁 项目结构

```
my-library/
├── apps/
│   └── docs/                # Docusaurus 文档站点
│       ├── docs/            # 文档内容
│       ├── blog/            # 博客文章
│       └── src/             # 自定义组件
├── packages/
│   ├── core/                # 核心工具库
│   │   ├── lib/             # 源码目录
│   │   ├── dist/            # 构建输出
│   │   └── types/           # 类型声明
│   └── tsconfig/            # 共享 TypeScript 配置
├── .changeset/              # 版本变更记录
├── .github/workflows/       # CI/CD 配置
└── turbo.json              # Turbo 构建配置
```

## 🚀 快速开始

### 1. 克隆模板

```bash
# 使用此模板创建新项目
npx create-turbo@latest -e https://github.com/JsonLee12138/turborepo-lib-rolldown my-library
cd my-library
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 开发模式

```bash
# 启动文档开发服务器
pnpm dev:docs

# 构建工具库
pnpm build

# 类型检查
pnpm typecheck
```

## 🛠️ 开发工作流

### 日常开发

```bash
# 启动文档站点 (http://localhost:3000)
pnpm dev:docs

# 实时构建工具库
pnpm --filter @jsonlee/core build --watch

# 代码检查
pnpm lint

# 格式化代码
pnpm format
```

### 版本发布

```bash
# 1. 记录变更
pnpm changeset

# 2. 更新版本号
pnpm version-packages

# 3. 发布到 npm
pnpm release
```

### Git 提交规范

```bash
# 使用 Commitizen 规范化提交
pnpm cz
```

## 🎯 核心优势

### ⚡ 极速构建体验

- **Rolldown** - 基于 Rust 的超快打包器，比 Rollup 快 10x+
- **Turbo** - 智能缓存和并行构建，增量构建秒级完成
- **OxLint** - 比 ESLint 快 50-100x 的 Rust 代码检查器

### 📦 多格式兼容

自动生成多种格式以兼容不同环境：

```json
{
  "main": "dist/cjs/index.cjs",     // CommonJS
  "module": "dist/es/index.mjs",    // ES Module
  "types": "types/index.d.ts",      // TypeScript
  "exports": {                      // 现代 exports 字段
    ".": {
      "import": "./dist/es/index.mjs",
      "require": "./dist/cjs/index.cjs",
      "types": "./types/index.d.ts"
    }
  }
}
```

### 📚 文档驱动开发

- **Docusaurus 3** - 现代化文档站点，支持 MDX
- **自动部署** - GitHub Pages 自动发布文档
- **版本同步** - 文档版本与库版本自动关联

### 🔄 自动化流程

- **Changesets** - 语义化版本管理
- **GitHub Actions** - 自动化测试、构建、发布
- **Git Hooks** - 提交前自动格式化和检查

## 📖 使用技巧

### 1. 自定义构建配置

编辑 `packages/core/rolldown.config.ts`：

```typescript
import { defineConfig } from 'rolldown'

export default defineConfig([
  // 添加自定义构建配置
  {
    input: './lib/index.ts',
    output: {
      format: 'esm',
      dir: 'dist/custom'
    },
    plugins: [
      // 添加插件
    ]
  }
])
```

### 2. 扩展文档功能

```bash
# 添加新的文档页面
mkdir apps/docs/docs/guide
echo "# 使用指南" > apps/docs/docs/guide/getting-started.md

# 自定义主题
pnpm --filter @jsonlee/docs swizzle @docusaurus/theme-classic Footer
```

### 3. 添加新包

```bash
# 创建新的工具包
mkdir packages/utils
cd packages/utils
pnpm init

# 更新 Turbo 配置以包含新包
```

### 4. 配置发布流程

```bash
# Beta 版本发布
git tag v1.0.0-beta.1
git push origin v1.0.0-beta.1

# 正式版本发布
git tag v1.0.0
git push origin v1.0.0
```

## 🔧 工具链详解

### 构建工具

- **Rolldown** - 下一代 JavaScript 打包器
- **Turbo** - 高性能构建系统
- **TypeScript** - 静态类型检查

### 代码质量

- **OxLint** - 超快速代码检查
- **Prettier** - 代码格式化
- **Husky** - Git hooks 管理
- **Lint-staged** - 暂存文件检查

### 版本管理

- **Changesets** - 版本和变更日志管理
- **Conventional Commits** - 规范化提交信息
- **Commitizen** - 交互式提交

## 🤝 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`pnpm cz`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📝 许可证

[MIT](./LICENSE) © [Your Name]

## 联系我们

- [Discord](https://discord.gg/666U6JTCQY)
- [QQ频道](https://pd.qq.com/s/fjwy3eo20?b=9) [![图片描述](./qq.jpg)](https://pd.qq.com/s/fjwy3eo20?b=9)
