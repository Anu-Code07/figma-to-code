import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import type { GeneratedFile, MergeStrategy } from '@design2code/design-ast';

export interface MergeOptions {
  projectRoot: string;
  strategy: MergeStrategy;
  dryRun?: boolean;
}

export interface MergeResult {
  created: string[];
  updated: string[];
  skipped: string[];
  diffs: FileDiff[];
}

export interface FileDiff {
  path: string;
  action: 'create' | 'update' | 'replace' | 'skip';
  oldContent?: string;
  newContent: string;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

export class MergeEngine {
  async apply(files: GeneratedFile[], options: MergeOptions): Promise<MergeResult> {
    const result: MergeResult = {
      created: [],
      updated: [],
      skipped: [],
      diffs: [],
    };

    for (const file of files) {
      const fullPath = join(options.projectRoot, file.path);
      const strategy = options.strategy === 'preview' ? 'preview' : file.action;
      const exists = existsSync(fullPath);

      if (exists && strategy === 'create') {
        result.skipped.push(file.path);
        continue;
      }

      let oldContent: string | undefined;
      if (exists) {
        oldContent = await readFile(fullPath, 'utf-8');
      }

      const diff: FileDiff = {
        path: file.path,
        action: exists ? (strategy === 'replace' ? 'replace' : 'update') : 'create',
        oldContent,
        newContent: file.content,
        hunks: computeDiff(oldContent ?? '', file.content),
      };

      result.diffs.push(diff);

      if (options.dryRun || strategy === 'preview') {
        continue;
      }

      if (!exists) {
        await this.writeFile(fullPath, file.content);
        result.created.push(file.path);
      } else if (strategy === 'replace') {
        await this.writeFile(fullPath, file.content);
        result.updated.push(file.path);
      } else if (strategy === 'merge') {
        const merged = this.intelligentMerge(oldContent!, file.content, file.language);
        await this.writeFile(fullPath, merged);
        result.updated.push(file.path);
      } else {
        await this.writeFile(fullPath, file.content);
        result.created.push(file.path);
      }
    }

    return result;
  }

  private async writeFile(path: string, content: string): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, 'utf-8');
  }

  private intelligentMerge(existing: string, generated: string, language: string): string {
    if (language === 'typescript' || language === 'javascript') {
      return this.mergeTypeScript(existing, generated);
    }
    if (language === 'dart') {
      return this.mergeDart(existing, generated);
    }
    return generated;
  }

  private mergeTypeScript(existing: string, generated: string): string {
    const existingImports = extractImports(existing);
    const generatedImports = extractImports(generated);
    const allImports = [...new Set([...existingImports, ...generatedImports])];

    const generatedBody = removeImportsAndExports(generated);
    const existingBody = removeImportsAndExports(existing);

    if (existingBody.includes('// design2code:merge-point')) {
      return existing.replace(
        /\/\/ design2code:merge-point[\s\S]*?\/\/ design2code:merge-end/,
        `// design2code:merge-point\n${generatedBody}\n// design2code:merge-end`,
      );
    }

    return `${allImports.join('\n')}\n\n${existingBody}\n\n// --- Design2Code generated ---\n${generatedBody}`;
  }

  private mergeDart(existing: string, generated: string): string {
    if (existing.includes('// design2code:merge-point')) {
      return existing.replace(
        /\/\/ design2code:merge-point[\s\S]*?\/\/ design2code:merge-end/,
        `// design2code:merge-point\n${removeDartImports(generated)}\n// design2code:merge-end`,
      );
    }
    return `${existing}\n\n// --- Design2Code generated ---\n${generated}`;
  }
}

function extractImports(code: string): string[] {
  return code.match(/^import .+$/gm) ?? [];
}

function removeImportsAndExports(code: string): string {
  return code.replace(/^import .+$/gm, '').replace(/^export .+$/gm, '').trim();
}

function removeDartImports(code: string): string {
  return code.replace(/^import .+$/gm, '').trim();
}

function computeDiff(oldContent: string, newContent: string): DiffHunk[] {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const hunks: DiffHunk[] = [];

  if (oldContent === newContent) return hunks;

  const maxLen = Math.max(oldLines.length, newLines.length);
  const lines: string[] = [];

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];
    if (oldLine !== newLine) {
      if (oldLine !== undefined) lines.push(`- ${oldLine}`);
      if (newLine !== undefined) lines.push(`+ ${newLine}`);
    }
  }

  if (lines.length > 0) {
    hunks.push({
      oldStart: 1,
      oldLines: oldLines.length,
      newStart: 1,
      newLines: newLines.length,
      lines,
    });
  }

  return hunks;
}

export function createMergeEngine(): MergeEngine {
  return new MergeEngine();
}
