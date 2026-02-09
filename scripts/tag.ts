// scripts/tag.ts — Create annotated git tags with changelog content
// Usage: deno run -A scripts/tag.ts [--dry-run] [--commit] [--tag-prefix <prefix>] [--changelog <path>] [--package <path>]

// ─── CLI args ────────────────────────────────────────────────────────

interface CliArgs {
  dryRun: boolean;
  tagPrefix: string;
  changelogPath: string;
  packagePath: string;
  commit: boolean;
}

function parseCliArgs(): CliArgs {
  const args = Deno.args;
  const opts: CliArgs = {
    dryRun: false,
    tagPrefix: "v",
    changelogPath: "packages/core/CHANGELOG.md",
    packagePath: "packages/core/package.json",
    commit: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--dry-run":
        opts.dryRun = true;
        break;
      case "--commit":
        opts.commit = true;
        break;
      case "--tag-prefix":
        opts.tagPrefix = args[++i] ?? opts.tagPrefix;
        break;
      case "--changelog":
        opts.changelogPath = args[++i] ?? opts.changelogPath;
        break;
      case "--package":
        opts.packagePath = args[++i] ?? opts.packagePath;
        break;
    }
  }
  return opts;
}

// ─── Version helpers ─────────────────────────────────────────────────

async function readVersion(packagePath: string): Promise<string> {
  const raw = await Deno.readTextFile(packagePath);
  const pkg = JSON.parse(raw);
  if (!pkg.version) {
    throw new Error(`No "version" field found in ${packagePath}`);
  }
  return pkg.version as string;
}

interface ParsedVersion {
  version: string;
  prerelease: string | null; // e.g. "beta", "alpha", "rc"
}

function parseVersion(version: string): ParsedVersion {
  // Match prerelease identifier: 3.0.0-beta.0 → "beta"
  const match = version.match(/^[\d.]+-([\w]+)/);
  return {
    version,
    prerelease: match ? match[1] : null,
  };
}

// ─── Changelog parsing ──────────────────────────────────────────────

async function parseChangelog(
  changelogPath: string,
  version: string,
): Promise<string | null> {
  let content: string;
  try {
    content = await Deno.readTextFile(changelogPath);
  } catch {
    console.warn(`⚠ Changelog not found at ${changelogPath}, using default message`);
    return null;
  }

  const lines = content.split("\n");
  const headerPattern = /^##\s+v?(\S+)/;
  let capturing = false;
  const captured: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(headerPattern);
    if (headerMatch) {
      if (capturing) break; // hit the next version header, stop
      if (headerMatch[1] === version) {
        capturing = true;
        continue; // skip the header line itself
      }
    } else if (capturing) {
      captured.push(line);
    }
  }

  if (captured.length === 0) return null;

  // Trim leading/trailing empty lines
  const trimmed = captured.join("\n").trim();
  return trimmed || null;
}

// ─── Git helpers ─────────────────────────────────────────────────────

async function runGit(
  args: string[],
  dryRun: boolean,
  label: string,
): Promise<boolean> {
  console.log(`$ git ${args.join(" ")}`);
  if (dryRun) {
    console.log(`  [dry-run] skipped: ${label}`);
    return true;
  }

  const command = new Deno.Command("git", {
    args,
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stderr } = await command.output();
  if (code !== 0) {
    const errMsg = new TextDecoder().decode(stderr);
    console.error(`✗ ${label} failed:\n${errMsg}`);
    return false;
  }
  return true;
}

async function tagExists(tagName: string): Promise<boolean> {
  const command = new Deno.Command("git", {
    args: ["tag", "-l", tagName],
    stdout: "piped",
    stderr: "piped",
  });
  const { stdout } = await command.output();
  const output = new TextDecoder().decode(stdout).trim();
  return output === tagName;
}

// ─── Formatting ──────────────────────────────────────────────────────

function formatTagMessage(
  version: string,
  prerelease: string | null,
  changelog: string | null,
): string {
  const title = prerelease
    ? `Release v${version} (${prerelease})`
    : `Release v${version}`;

  if (changelog) {
    return `${title}\n\n${changelog}`;
  }
  return title;
}

function formatCommitMessage(
  version: string,
  prerelease: string | null,
  changelog: string | null,
): string {
  const suffix = prerelease ? ` (${prerelease})` : "";
  const title = `chore(release): v${version}${suffix}`;

  if (changelog) {
    return `${title}\n\n${changelog}`;
  }
  return title;
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  const opts = parseCliArgs();

  if (opts.dryRun) {
    console.log("[dry-run mode enabled]\n");
  }

  // 1. Read version
  const version = await readVersion(opts.packagePath);
  const { prerelease } = parseVersion(version);
  const tagName = `${opts.tagPrefix}${version}`;

  console.log(`Version : ${version}`);
  console.log(`Tag     : ${tagName}`);
  if (prerelease) {
    console.log(`Pre-rel : ${prerelease}`);
  }

  // 2. Parse changelog
  const changelog = await parseChangelog(opts.changelogPath, version);
  if (changelog) {
    console.log(`Changelog:\n${changelog}\n`);
  } else {
    console.log("Changelog: (not found for this version)\n");
  }

  // 3. Check if tag already exists
  if (await tagExists(tagName)) {
    console.error(`✗ Tag "${tagName}" already exists. Aborting.`);
    Deno.exit(1);
  }

  // 4. Stage and commit (if --commit)
  if (opts.commit) {
    const commitMsg = formatCommitMessage(version, prerelease, changelog);
    console.log("─── Commit ───");

    const addOk = await runGit(["add", "."], opts.dryRun, "git add");
    if (!addOk) Deno.exit(1);

    const commitOk = await runGit(
      ["commit", "-m", commitMsg],
      opts.dryRun,
      "git commit",
    );
    if (!commitOk) Deno.exit(1);
  }

  // 5. Create annotated tag
  const tagMessage = formatTagMessage(version, prerelease, changelog);
  console.log("─── Tag ───");

  const tagOk = await runGit(
    ["tag", tagName, "-m", tagMessage],
    opts.dryRun,
    "git tag",
  );
  if (!tagOk) Deno.exit(1);

  console.log(`\n✓ Tagged ${tagName}`);
}

main();
