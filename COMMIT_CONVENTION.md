# Hook-Fetch 代码提交规范

本文档描述了 Hook-Fetch 项目的代码提交规范，基于 Conventional Commits 标准，旨在保持提交历史的清晰、一致和可追溯性。

## 📋 目录

- [已安装的工具库](#已安装的工具库)
- [提交信息格式](#提交信息格式)
- [提交类型](#提交类型)
- [提交示例](#提交示例)
- [使用方式](#使用方式)
- [自动化流程](#自动化流程)

## 已安装的工具库

项目使用以下工具实现代码提交规范：

| 包名 | 版本 | 作用 |
|------|------|------|
| `@commitlint/cli` | ^19.8.1 | 提交信息验证工具 |
| `@commitlint/config-conventional` | ^19.8.1 | Conventional Commits 规范配置 |
| `cz-git` | ^1.12.0 | 交互式提交工具 |
| `husky` | ^9.1.7 | Git Hooks 管理 |
| `lint-staged` | ^13.3.0 | 提交前代码格式化 |
| `oxlint` | ^1.16.0 | 代码 linting 工具 |

## 配置文件

| 文件 | 说明 |
|------|------|
| `.commitlintrc.cjs` | Commitlint 配置，定义提交规范和交互式提示 |
| `.lintstagedrc` | Lint-staged 配置，定义提交前自动修复规则 |
| `.husky/pre-commit` | Git pre-commit hook，触发 lint-staged |
| `package.json` | 包含 npm scripts 和 commitizen 配置 |

## 提交信息格式

采用 Conventional Commits 规范：

```
<type>[optional scope]: <description>

[optional body]
[optional footer]
```

### 格式说明

```bash
type(scope): subject
```

- **type** (必填): 提交类型，小写英文
- **scope** (可选): 提交范围，描述修改的影响范围
- **subject** (必填): 简短描述，使用现在时态，不以句号结尾

### 规则要求

1. type 必须是小写英文
2. subject 使用现在时态，不以句号结尾
3. subject 首字母不大写（除非专有名词）
4. 可使用中文或英文，建议保持一致性

## 提交类型

| 类型 | 说明 | 使用场景 |
|------|------|----------|
| `feat` | 新增功能 | 添加新特性、新 API |
| `fix` | 修复缺陷 | 修复 bug、错误处理 |
| `docs` | 文档更新 | 修改文档、README |
| `style` | 代码格式 | 代码格式化、风格调整 |
| `refactor` | 代码重构 | 重构代码，不改变功能 |
| `perf` | 性能提升 | 性能优化 |
| `test` | 测试相关 | 添加/修改测试 |
| `build` | 构建相关 | 修改构建配置、依赖 |
| `ci` | 持续集成 | CI/CD 配置 |
| `revert` | 回退代码 | 回退之前的提交 |
| `chore` | 其他修改 | 杂项修改 |

### 类型详解

#### feat - 新增功能
```bash
feat: add request cancellation support
feat(core): add retry plugin
feat(react): add useFetch hook
```

#### fix - 修复缺陷
```bash
fix: handle network error properly
fix(core): resolve memory leak
fix(plugins): fix timeout plugin
```

#### docs - 文档更新
```bash
docs: update API documentation
docs: fix typo in README
docs(plugins): add plugin guide
```

#### style - 代码格式
```bash
style: format code with prettier
style: remove trailing whitespace
```

#### refactor - 代码重构
```bash
refactor: optimize interceptor logic
refactor(core): simplify error handling
```

#### perf - 性能提升
```bash
perf: reduce bundle size
perf(core): optimize memory usage
```

#### test - 测试相关
```bash
test: add unit tests for retry
test: fix failing tests
```

#### build - 构建相关
```bash
build: update rollup config
build: upgrade dependencies
```

#### ci - 持续集成
```bash
ci: add GitHub Actions
ci: update pnpm lockfile
```

#### revert - 回退代码
```bash
revert: revert "feat: add new plugin"
```

#### chore - 其他修改
```bash
chore: update .gitignore
chore(release): version packages
```

## 提交范围 (Scope)

Scope 用于指定修改的具体模块或功能范围。

### 常用 Scope

| Scope | 说明 |
|-------|------|
| `core` | 核心功能 |
| `plugins` | 插件系统 |
| `react` | React 集成 |
| `vue` | Vue 集成 |
| `docs` | 文档 |
| `test` | 测试 |
| `build` | 构建配置 |
| `ci` | CI/CD |
| `types` | 类型定义 |

### Scope 示例

```bash
feat(core): add request interceptor
fix(plugins): fix retry timeout
docs(react): update hook usage
refactor(types): improve type inference
```

## 提交示例

### 简单提交
```bash
feat: add support for FormData
fix: handle network errors
```

### 带范围的提交
```bash
feat(core): add request timeout configuration
fix(plugins): resolve memory leak
```

### 带正文的提交
```bash
fix: handle network errors in streaming mode

Previously, network errors during streaming responses were not
properly handled, causing the application to hang. This fix
adds proper error handling and cleanup for streaming requests.

Fixes #123
```

### 带破坏性变更的提交
```bash
feat!: change default timeout to 5000ms

BREAKING CHANGE: The default timeout has been changed from
3000ms to 5000ms. Please update your configuration if needed.
```

### 带问题关联的提交
```bash
fix: resolve memory leak in request queue

- Fix memory leak when requests are cancelled
- Improve cleanup logic for pending requests

Closes #45
Fixes #67
```

## 使用方式

### 方式 1：交互式提交（推荐）

```bash
pnpm cz
```

系统会依次询问：
1. 选择提交类型 (feat/fix/docs 等)
2. 输入提交范围 (可选)
3. 填写简短描述
4. 填写详细描述 (可选)
5. 关联 Issue (可选)
6. 确认提交

### 方式 2：手动提交

```bash
git add .
git commit -m "feat: add new feature"
```

提交时会自动验证格式，不符合规范将被拒绝。

## 自动化流程

### 提交前自动执行

当执行 `git commit` 时，会触发以下自动化流程：

1. **Git Hook 触发**: Husky 触发 `pre-commit` hook
2. **代码格式化**: 自动运行 `lint-staged`
   - 使用 `oxlint --fix` 修复代码格式问题
3. **提交验证**: `commitlint` 验证提交信息格式
4. **验证结果**:
   - ✅ 通过：提交成功
   - ❌ 失败：提交被拒绝，需修正后重新提交

### 相关命令

```bash
# 交互式提交
pnpm cz

# 手动格式化代码
pnpm lint:fix

# 检查提交信息格式
npx commitlint --from=HEAD~1 --to=HEAD --verbose
```

## 最佳实践

### ✅ 推荐做法

1. **原子提交**：每个提交只做一件事
2. **清晰描述**：使用简洁明了的描述
3. **使用范围**：当修改影响特定模块时使用 scope
4. **关联问题**：在正文中关联相关 issue
5. **英文提交**：建议使用英文，保持一致性

```bash
# ✅ 好的示例
feat: add request cancellation support
fix(core): resolve memory leak in interceptor chain
docs: update plugin development guide
```

### ❌ 避免做法

1. **模糊描述**：避免 "update"、"fix" 等过于简单的描述
2. **过长描述**：subject 应该简洁，详细说明放正文
3. **缺少类型**：必须指定提交类型
4. **混合修改**：避免在一个提交中包含多个不相关的修改

```bash
# ❌ 不好的示例
update code
fix bug
feat: add feature A and fix bug B
```

## 配置说明

### .commitlintrc.cjs

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'build', 'chore', 'ci', 'docs', 'feat', 'fix',
      'perf', 'refactor', 'revert', 'style', 'test'
    ]]
  },
  prompt: {
    // 交互式提示配置（中英双语）
    types: [...],
    messages: {...}
  }
}
```

### package.json

```json
{
  "scripts": {
    "cz": "cz"
  },
  "config": {
    "commitizen": {
      "path": "node_modules/cz-git"
    }
  }
}
```

### .lintstagedrc

```json
{
  "**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}": "npx oxlint --fix"
}
```

### .husky/pre-commit

```bash
pnpm lint-staged
```

## 参考资料

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Commitlint Documentation](https://commitlint.js.org/)
- [cz-git](https://github.com/Zhengqbbb/cz-git)

---

**最后更新**: 2026-01-12
**维护者**: Hook-Fetch Team
