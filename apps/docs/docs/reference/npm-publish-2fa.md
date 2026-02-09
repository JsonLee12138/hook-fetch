---
sidebar_position: 3
---

# npm 发布与 CI/CD 认证指南

npm 于 2025 年 12 月 9 日永久废弃了所有 Classic Token，并强制启用 2FA。本文档说明如何使用 npm 官方推荐的 **Trusted Publishing（OIDC）** 方案恢复 CI/CD 自动发布能力。

## 问题背景

npm 的认证策略经历了以下变化：

| 时间 | 变化 |
|------|------|
| 2025.12.09 | Classic Token 永久废弃并全部吊销 |
| 2025.12+ | Granular Token 最长有效期缩短至 90 天，且默认要求 2FA |
| 2025.07 | Trusted Publishing (OIDC) 正式 GA |

这导致原有基于 `NPM_TOKEN` 的 CI/CD 流水线发布失败：

```
npm ERR! This operation requires a one-time password.
```

## 方案对比

| 方案 | 需要 Token | 需要轮换 | 安全性 | npm 推荐 |
|------|-----------|---------|--------|---------|
| ~~Classic Token~~ | ~~是~~ | ~~是~~ | ~~低~~ | ~~已废弃~~ |
| Granular Token | 是 | 每 90 天 | 中 | 过渡方案 |
| **Trusted Publishing (OIDC)** | **否** | **无需** | **高** | **推荐** |

---

## 方案一：Trusted Publishing（推荐）

Trusted Publishing 基于 [OIDC（OpenID Connect）](https://openid.net/developers/how-connect-works/) 协议，CI/CD 环境直接与 npm 建立信任关系，**完全不需要任何 token**。

### 工作原理

```
GitHub Actions 触发 → 生成 OIDC 短期令牌（JWT）→ npm 验证签名和来源 → 授权发布
```

- 令牌仅在当次发布期间有效，用完即弃
- npm 验证 JWT 中的仓库、workflow 文件名等信息是否与预配置匹配
- 自动附带 provenance（来源证明），无需手动添加 `--provenance`

### 前置要求

- npm CLI ≥ 11.5.1（Node.js 22+ 或手动升级 npm）
- GitHub Actions 或 GitLab CI/CD（仅支持云端 runner，暂不支持 self-hosted）
- 包已在 npm 上发布过至少一次（首次发布需用其他方式）

### 第一步：在 npm 网站配置 Trusted Publisher

1. 登录 [npmjs.com](https://www.npmjs.com/)
2. 进入你的包 → **Settings**（`npmjs.com/package/你的包名/settings`）
3. 找到 **Trusted Publishers** 部分
4. 选择 **GitHub Actions**，填写：

| 配置项 | 值 | 说明 |
|--------|-----|------|
| Organization/Owner | 你的 GitHub 用户名或组织名 | 仓库所有者 |
| Repository | 仓库名 | 不含所有者前缀 |
| Workflow filename | `release.yml` | workflow 文件名（不含路径） |
| Environment | 留空或填写 | 可选，用于进一步限制 |

5. 保存配置

### 第二步：确保 package.json 配置正确

`repository.url` 必须与 GitHub 仓库地址**完全匹配**（包括大小写），npm 会用它做 provenance 校验：

```json
{
  "name": "hook-fetch",
  "repository": {
    "type": "git",
    "url": "https://github.com/user/hook-fetch"
  }
}
```

### 第三步：更新 GitHub Actions Workflow

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: write
  id-token: write    # 必须：用于 OIDC 认证

jobs:
  release:
    runs-on: ubuntu-latest

    env:
      TAG_NAME: ${{ github.ref_name }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: 'https://registry.npmjs.org'

      - name: Update npm to latest
        run: npm install -g npm@latest

      - name: Install dependencies
        run: |
          npm i -g pnpm
          pnpm install

      - name: Build
        run: pnpm build

      - name: Publish
        run: |
          if [[ "$TAG_NAME" == *beta* ]]; then
            echo "发布 beta 版本"
            pnpm publish:beta
          else
            echo "发布 release 版本"
            pnpm publish:release
          fi
```

#### 关键变更

| 变更 | 说明 |
|------|------|
| 新增 `id-token: write` 权限 | 允许 GitHub Actions 生成 OIDC 令牌 |
| 新增 `registry-url` | `setup-node` 需要知道 registry 地址 |
| Node.js 升级到 22 | 确保 npm CLI ≥ 11.5.1 |
| 新增 `npm install -g npm@latest` | 确保 npm 版本足够新 |
| **删除** `NPM_TOKEN` 相关步骤 | 不再需要写入 `.npmrc`，不再需要 `NPM_TOKEN` secret |

:::caution 重要
使用 Trusted Publishing 时，**不要**设置 `NODE_AUTH_TOKEN` 环境变量（即使是空字符串），否则会阻止 OIDC 认证流程。
:::

### 第四步：清理旧配置

1. 删除 GitHub Secret 中的 `NPM_TOKEN`（Settings → Secrets → Actions）
2. 在 npm 网站上吊销旧的 Access Token

---

## 方案二：Granular Access Token（过渡方案）

如果你的场景不满足 Trusted Publishing 的要求（如使用 self-hosted runner、首次发布新包等），可使用 Granular Access Token 作为过渡。

### 配置步骤

1. 登录 [npmjs.com](https://www.npmjs.com/) → **Access Tokens** → **Generate New Token** → **Granular Access Token**

| 配置项 | 推荐值 | 说明 |
|--------|--------|------|
| Token name | `github-actions-release` | 便于识别用途 |
| Expiration | ≤ 90 天 | npm 当前最长有效期 |
| Packages and scopes | **Only select packages and scopes** | 最小权限原则 |
| Permissions | **Read and write** | 发布需要写权限 |

2. 将生成的 token 存入 GitHub Secret（`NPM_TOKEN`）
3. Workflow 中通过 `.npmrc` 注入 token：

```yaml
- name: 写入 npm 登录凭证
  run: echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > ~/.npmrc
  env:
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 注意事项

- Token 最长 90 天过期，需要定期轮换
- 仅授权需要发布的包，不要选择 All packages
- 不再使用的 token 及时删除

---

## 排查清单

### Trusted Publishing 排查

| 检查项 | 验证方式 |
|--------|----------|
| npm CLI 版本 ≥ 11.5.1 | CI 日志中确认 `npm --version` |
| `id-token: write` 权限 | workflow YAML 中确认 permissions |
| 未设置 `NODE_AUTH_TOKEN` | workflow 中确认未注入该环境变量 |
| `repository.url` 匹配 | `package.json` 中的 URL 与 GitHub 仓库完全一致 |
| npm 上已配置 Trusted Publisher | 包设置页面确认 workflow 文件名等信息 |
| 包已发布过 | 首次发布必须使用 token 方式 |

### Granular Token 排查

| 检查项 | 验证方式 |
|--------|----------|
| Token 类型正确 | npm 网站确认为 Granular Access Token |
| Token 未过期 | npm 网站查看有效期（最长 90 天） |
| GitHub Secret 已更新 | Settings → Secrets 中检查更新时间 |
| 包权限匹配 | Token scope 包含目标包 |
| 权限为 Read and write | Token 设置页确认 |

## 参考链接

- [npm Trusted Publishing 官方文档](https://docs.npmjs.com/trusted-publishers/)
- [GitHub Changelog: npm trusted publishing with OIDC is generally available](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/)
- [npm Adopts OIDC for Trusted Publishing](https://socket.dev/blog/npm-trusted-publishing)
- [从 Classic Token 到 OIDC Trusted Publishing 的迁移实践](https://dev.to/zhangjintao/from-deprecated-npm-classic-tokens-to-oidc-trusted-publishing-a-cicd-troubleshooting-journey-4h8b)
