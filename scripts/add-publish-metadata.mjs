import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packages = [
  'packages/design-ast',
  'packages/figma-parser',
  'packages/design-token-engine',
  'packages/component-detector',
  'packages/ai-engine',
  'packages/merge-engine',
  'packages/generator-sdk',
  'packages/compiler-core',
  'packages/cli',
  'packages/mcp-server',
  'packages/generators/flutter',
  'packages/generators/react',
  'packages/generators/nextjs',
  'packages/generators/react-native',
];

const shared = {
  license: 'MIT',
  files: ['dist'],
  publishConfig: { access: 'public' },
  bugs: { url: 'https://github.com/Anu-Code07/figma-to-code/issues' },
  homepage: 'https://github.com/Anu-Code07/figma-to-code#readme',
  keywords: ['figma', 'design-to-code', 'codegen', 'flutter', 'react', 'nextjs', 'mcp'],
  engines: { node: '>=20.0.0' },
};

for (const pkgDir of packages) {
  const path = join(root, pkgDir, 'package.json');
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  Object.assign(pkg, shared, {
    repository: {
      type: 'git',
      url: 'git+https://github.com/Anu-Code07/figma-to-code.git',
      directory: pkgDir,
    },
  });
  if (!pkg.scripts.prepublishOnly) {
    pkg.scripts.prepublishOnly = 'pnpm run build';
  }
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`updated ${pkgDir}`);
}
