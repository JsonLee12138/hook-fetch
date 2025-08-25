import packageJson from '../packages/core/package.json' with { type: "json" };

(async function (){
  const version = packageJson.version;
  const tag = `v${version}`;
  console.log('tag', tag);
  const commit = `chore(release): version packages`;
  const command = new Deno.Command("git", {
    args: ['tag', tag, '-m', commit],
  })
  const { code } = await command.output();
  if (code !== 0) {
    throw new Error('Failed to tag');
  }
})()
