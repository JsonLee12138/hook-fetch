# scripts/tag.ts

从 `CHANGELOG.md` 提取当前版本的变更内容，创建带有完整 changelog 信息的 annotated git tag。

## 前置依赖

- [Deno](https://deno.land/) runtime

## 用法

```bash
deno run -A scripts/tag.ts [options]
```

## 参数

| Flag | 默认值 | 说明 |
|------|--------|------|
| `--dry-run` | `false` | 仅打印操作，不实际执行任何 git 命令 |
| `--commit` | `false` | 创建 tag 前自动执行 `git add . && git commit` |
| `--tag-prefix` | `v` | tag 名称前缀（如 `v2.3.1`） |
| `--changelog` | `packages/core/CHANGELOG.md` | changelog 文件路径 |
| `--package` | `packages/core/package.json` | 读取版本号的 package.json 路径 |

## 示例

```bash
# 仅创建 tag（不 commit）
deno run -A scripts/tag.ts

# dry-run 预览，不执行任何操作
deno run -A scripts/tag.ts --dry-run

# 自动 commit + tag（发布流程中使用）
deno run -A scripts/tag.ts --commit

# dry-run 预览完整 commit + tag 流程
deno run -A scripts/tag.ts --dry-run --commit

# 自定义 changelog 路径
deno run -A scripts/tag.ts --changelog path/to/CHANGELOG.md
```

## 发布流程

root `package.json` 中的 `tag` 脚本整合了完整的发布流程：

```bash
pnpm tag
```

等价于：

```bash
changeset version && deno run -A scripts/tag.ts --commit && git push --follow-tags
```

执行步骤：

1. `changeset version` — 根据 changeset 更新版本号和 CHANGELOG
2. `scripts/tag.ts --commit` — 暂存所有变更、创建 commit、创建 annotated tag
3. `git push --follow-tags` — 推送 commit 和 tag 到远程

## 生成的消息格式

### Tag message

稳定版：

```
Release v2.3.1

### Patch Changes

- 修改resolve后仍然会继续请求的问题
```

预发布版：

```
Release v3.0.0-beta.0 (beta)

### Major Changes

- 重构插件系统
```

### Commit message（`--commit` 模式）

```
chore(release): v2.3.1

### Patch Changes

- 修改resolve后仍然会继续请求的问题
```

## 安全检查

- 创建 tag 前检查该 tag 是否已存在，若存在则中止
- git 命令失败时输出完整的 stderr 错误信息
- changelog 未找到对应版本时发出警告，使用默认消息继续执行
