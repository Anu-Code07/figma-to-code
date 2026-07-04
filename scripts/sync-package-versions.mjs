import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/sync-package-versions.mjs <version>');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packagePaths = [
  'package.json',
  'packages/design-ast/package.json',
  'packages/figma-parser/package.json',
  'packages/design-token-engine/package.json',
  'packages/component-detector/package.json',
  'packages/ai-engine/package.json',
  'packages/merge-engine/package.json',
  'packages/generator-sdk/package.json',
  'packages/compiler-core/package.json',
  'packages/cli/package.json',
  'packages/mcp-server/package.json',
  'packages/generators/flutter/package.json',
  'packages/generators/react/package.json',
  'packages/generators/nextjs/package.json',
  'packages/generators/react-native/package.json',
];

for (const relativePath of packagePaths) {
  const path = join(root, relativePath);
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  pkg.version = version;
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`set ${relativePath} → ${version}`);
}
