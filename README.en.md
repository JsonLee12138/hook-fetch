# 🚀 Turbo Library Template

> Modern library development template powered by Turbo, Rolldown, and Docusaurus

English | [中文](https://github.com/JsonLee12138/turborepo-lib-rolldown/blob/main/README.md)

## ✨ Features

- 🏗️ **Monorepo Architecture** - High-performance build system with Turbo + pnpm
- ⚡ **Lightning Fast Build** - Millisecond-level build experience with Rolldown
- 📚 **Documentation First** - Modern documentation site with Docusaurus 3
- 🔧 **Complete Toolchain** - ESLint, OxLint, Prettier, TypeScript out of the box
- 📦 **Multi-format Output** - Auto-generate ESM, CJS, UMD and TypeScript declarations
- 🔄 **Version Management** - Automated version publishing with Changesets
- 🎯 **CI/CD Ready** - Complete publishing workflow with GitHub Actions
- 💾 **Git Workflow** - Standardized commits with Husky + Commitizen + Lint-staged

## 📁 Project Structure

```
my-library/
├── apps/
│   └── docs/                # Docusaurus documentation site
│       ├── docs/            # Documentation content
│       ├── blog/            # Blog posts
│       └── src/             # Custom components
├── packages/
│   ├── core/                # Core library
│   │   ├── lib/             # Source code
│   │   ├── dist/            # Build output
│   │   └── types/           # Type declarations
│   └── tsconfig/            # Shared TypeScript configs
├── .changeset/              # Version change records
├── .github/workflows/       # CI/CD configurations
└── turbo.json              # Turbo build config
```

## 🚀 Quick Start

### 1. Clone Template

```bash
# Create new project using this template
npx create-turbo@latest -e https://github.com/JsonLee12138/turborepo-lib-rolldown my-library
cd my-library
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Development Mode

```bash
# Start documentation dev server
pnpm dev:docs

# Build library
pnpm build

# Type checking
pnpm typecheck
```

## 🛠️ Development Workflow

### Daily Development

```bash
# Start documentation site (http://localhost:3000)
pnpm dev:docs

# Build library in watch mode
pnpm --filter @jsonlee/core build --watch

# Code linting
pnpm lint

# Code formatting
pnpm format
```

### Version Release

```bash
# 1. Record changes
pnpm changeset

# 2. Update version numbers
pnpm version-packages

# 3. Publish to npm
pnpm release
```

### Git Commit Standards

```bash
# Use Commitizen for standardized commits
pnpm cz
```

## 🎯 Core Advantages

### ⚡ Lightning Fast Build Experience

- **Rolldown** - Rust-based super-fast bundler, 10x+ faster than Rollup
- **Turbo** - Smart caching and parallel builds, incremental builds in seconds
- **OxLint** - Rust-based linter that's 50-100x faster than ESLint

### 📦 Multi-format Compatibility

Auto-generate multiple formats for different environments:

```json
{
  "main": "dist/cjs/index.cjs",     // CommonJS
  "module": "dist/es/index.mjs",    // ES Module
  "types": "types/index.d.ts",      // TypeScript
  "exports": {                      // Modern exports field
    ".": {
      "import": "./dist/es/index.mjs",
      "require": "./dist/cjs/index.cjs",
      "types": "./types/index.d.ts"
    }
  }
}
```

### 📚 Documentation-Driven Development

- **Docusaurus 3** - Modern documentation site with MDX support
- **Auto Deployment** - Automatic documentation publishing to GitHub Pages
- **Version Sync** - Documentation version automatically linked with library version

### 🔄 Automated Workflow

- **Changesets** - Semantic version management
- **GitHub Actions** - Automated testing, building, and publishing
- **Git Hooks** - Pre-commit formatting and linting

## 📖 Usage Tips

### 1. Custom Build Configuration

Edit `packages/core/rolldown.config.ts`:

```typescript
import { defineConfig } from 'rolldown'

export default defineConfig([
  // Add custom build configuration
  {
    input: './lib/index.ts',
    output: {
      format: 'esm',
      dir: 'dist/custom'
    },
    plugins: [
      // Add plugins
    ]
  }
])
```

### 2. Extend Documentation Features

```bash
# Add new documentation pages
mkdir apps/docs/docs/guide
echo "# Getting Started" > apps/docs/docs/guide/getting-started.md

# Customize theme
pnpm --filter @jsonlee/docs swizzle @docusaurus/theme-classic Footer
```

### 3. Add New Packages

```bash
# Create new utility package
mkdir packages/utils
cd packages/utils
pnpm init

# Update Turbo config to include new package
```

### 4. Configure Publishing Workflow

```bash
# Beta version release
git tag v1.0.0-beta.1
git push origin v1.0.0-beta.1

# Production version release
git tag v1.0.0
git push origin v1.0.0
```

## 🔧 Toolchain Details

### Build Tools

- **Rolldown** - Next-generation JavaScript bundler
- **Turbo** - High-performance build system
- **TypeScript** - Static type checking

### Code Quality

- **OxLint** - Ultra-fast code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks management
- **Lint-staged** - Staged files linting

### Version Management

- **Changesets** - Version and changelog management
- **Conventional Commits** - Standardized commit messages
- **Commitizen** - Interactive commits

## 🤝 Contributing

1. Fork this project
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`pnpm cz`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Create Pull Request

## 📝 License

[MIT](./LICENSE) © [Your Name]

## Contact US

- [Discord](https://discord.gg/666U6JTCQY)
