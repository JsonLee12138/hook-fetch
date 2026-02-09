---
name: tag
description: >
  Create annotated git tags with changelog content for package releases.
  Runs scripts/tag.ts via Deno to extract the current version from package.json,
  parse CHANGELOG.md for release notes, and create annotated git tags.
  Supports dry-run preview, auto-commit before tagging, and prerelease versions.
  Use when the user wants to create a release tag, run pnpm tag or the full
  release flow, tag a version, preview a tag with dry-run, or publish/release
  a package version. Triggers on tag, create tag, release tag, pnpm tag,
  version tag, git tag, publish release.
---

# Tag

Create annotated git tags with changelog content extracted from CHANGELOG.md.

## Script Location

`scripts/tag.ts` — requires [Deno](https://deno.land/) runtime.

## Usage

```bash
deno run -A scripts/tag.ts [options]
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--dry-run` | `false` | Print operations without executing git commands |
| `--commit` | `false` | Run `git add . && git commit` before creating tag |
| `--tag-prefix` | `v` | Tag name prefix (e.g. `v2.3.1`) |
| `--changelog` | `packages/core/CHANGELOG.md` | Changelog file path |
| `--package` | `packages/core/package.json` | package.json path for version |

## Workflow

### Full release flow (`pnpm tag`)

```bash
pnpm tag
```

Equivalent to:

```bash
changeset version && deno run -A scripts/tag.ts --commit && git push --follow-tags
```

Steps:
1. `changeset version` — update version and CHANGELOG from changesets
2. `scripts/tag.ts --commit` — stage all changes, commit, create annotated tag
3. `git push --follow-tags` — push commit and tag to remote

### Tag only (no commit)

```bash
deno run -A scripts/tag.ts
```

### Dry-run preview

```bash
deno run -A scripts/tag.ts --dry-run
# or with commit preview:
deno run -A scripts/tag.ts --dry-run --commit
```

## Generated Message Formats

### Tag message

Stable: `Release v2.3.1` + changelog body
Prerelease: `Release v3.0.0-beta.0 (beta)` + changelog body

### Commit message (`--commit` mode)

```
chore(release): v2.3.1

### Patch Changes

- Fix description here
```

## Safety

- Aborts if tag already exists
- Outputs full stderr on git failure
- Warns if changelog section not found for version (uses default message)
