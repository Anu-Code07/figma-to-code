import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const root = process.cwd();
const from = '@figma-to-code';
const to = '@figma-to-code';
const orgFrom = 'design2code';
const orgTo = 'figma-to-code';

const extensions = new Set(['.json', '.ts', '.tsx', '.md', '.yml', '.yaml', '.sh', '.mjs', '.rc']);
const skipDirs = new Set(['node_modules', '.git', 'dist', '.turbo']);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (skipDirs.has(entry)) continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path, files);
      continue;
    }
    if (!extensions.has(extname(path)) && !path.endsWith('.npmrc')) continue;
    files.push(path);
  }
  return files;
}

function replaceInFile(path) {
  let content = readFileSync(path, 'utf8');
  const original = content;
  content = content.replaceAll(from, to);
  if (path.includes('verify-npm-scope.mjs')) {
    content = content.replaceAll(`npm org ls ${orgFrom}`, `npm org ls ${orgTo}`);
    content = content.replaceAll(`@${orgFrom}`, `@${orgTo}`);
    content = content.replaceAll(`organization: ${orgFrom}`, `organization: ${orgTo}`);
  }
  if (content !== original) {
    writeFileSync(path, content);
    console.log(`updated ${path}`);
  }
}

for (const file of walk(root)) {
  replaceInFile(file);
}

console.log('Done. Run pnpm install to refresh lockfile.');
