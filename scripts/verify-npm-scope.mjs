import { execSync } from 'node:child_process';

function run(command) {
  return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

let whoami;
try {
  whoami = run('npm whoami');
} catch {
  console.error('Not authenticated with npm. Set NPM_TOKEN or NODE_AUTH_TOKEN.');
  process.exit(1);
}

console.log(`npm user: ${whoami}`);

try {
  const members = run('npm org ls figma-to-code');
  console.log('Scope @figma-to-code: access confirmed');
  if (members) {
    console.log(members);
  }
} catch {
  console.error(`
Cannot publish to @figma-to-code/*.

npm user "${whoami}" is not an owner of the @figma-to-code organization.

To fix:
  1. Open https://www.npmjs.com/org/create
  2. Create organization: figma-to-code
  3. Ensure NPM_TOKEN belongs to that org owner (or add the user as owner)
  4. Token type: Automation (recommended for CI) with publish permission
  5. Re-run Actions → Publish → Run workflow

If the org name is taken, choose a different scope and rename packages in this repo.
`);
  process.exit(1);
}
