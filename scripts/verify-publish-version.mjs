const version = process.argv[2];

if (!version) {
  console.error('Usage: node scripts/verify-publish-version.mjs <version>');
  process.exit(1);
}

const semverPattern = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;
if (!semverPattern.test(version)) {
  console.error(`Invalid semver: ${version}`);
  process.exit(1);
}

const response = await fetch(`https://registry.npmjs.org/@figma-to-code/cli/${version}`, {
  headers: { accept: 'application/json' },
});

if (response.ok) {
  console.error(`@figma-to-code/cli@${version} is already published on npm.`);
  process.exit(1);
}

if (response.status !== 404) {
  const body = await response.text();
  console.error(`Failed to check npm registry (${response.status}): ${body}`);
  process.exit(1);
}

console.log(`Version ${version} is available to publish.`);
