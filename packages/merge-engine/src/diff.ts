import type { FileDiff } from './merger.js';

export function formatDiff(diff: FileDiff): string {
  const lines: string[] = [
    `--- a/${diff.path}`,
    `+++ b/${diff.path}`,
    `@@ -${diff.hunks[0]?.oldStart ?? 0},${diff.hunks[0]?.oldLines ?? 0} +${diff.hunks[0]?.newStart ?? 0},${diff.hunks[0]?.newLines ?? 0} @@`,
  ];

  for (const hunk of diff.hunks) {
    lines.push(...hunk.lines);
  }

  return lines.join('\n');
}

export function formatDiffSummary(diffs: FileDiff[]): string {
  const created = diffs.filter((d) => d.action === 'create').length;
  const updated = diffs.filter((d) => d.action === 'update' || d.action === 'replace').length;
  return `${created} file(s) to create, ${updated} file(s) to update`;
}
