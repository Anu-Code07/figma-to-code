import type { DesignTokenSet } from '@design2code/design-ast';

export interface TokenOutput {
  path: string;
  content: string;
  language: string;
}

export function generateFlutterTheme(tokens: DesignTokenSet): TokenOutput {
  const colorLines = tokens.colors.map(
    (c) => `  static const Color ${toCamelCase(c.name)} = Color(0xFF${c.value.replace('#', '')});`,
  );
  const spacingLines = tokens.spacing.map(
    (s) => `  static const double ${toCamelCase(s.name)} = ${s.value};`,
  );

  return {
    path: 'lib/core/theme/app_tokens.dart',
    language: 'dart',
    content: `import 'package:flutter/material.dart';

/// Auto-generated design tokens
class AppTokens {
  AppTokens._();

${colorLines.join('\n')}

${spacingLines.join('\n')}
}
`,
  };
}

export function generateTailwindConfig(tokens: DesignTokenSet): TokenOutput {
  const colors: Record<string, string> = {};
  const spacing: Record<string, string> = {};
  const borderRadius: Record<string, string> = {};

  for (const c of tokens.colors) {
    colors[toKebabCase(c.name)] = c.value;
  }
  for (const s of tokens.spacing) {
    spacing[toKebabCase(s.name)] = `${s.value}px`;
  }
  for (const r of tokens.radius) {
    borderRadius[toKebabCase(r.name)] = `${r.value}px`;
  }

  return {
    path: 'tailwind.tokens.js',
    language: 'javascript',
    content: `/** Auto-generated design tokens */
module.exports = {
  theme: {
    extend: {
      colors: ${JSON.stringify(colors, null, 6).replace(/^/gm, '      ')},
      spacing: ${JSON.stringify(spacing, null, 6).replace(/^/gm, '      ')},
      borderRadius: ${JSON.stringify(borderRadius, null, 6).replace(/^/gm, '      ')},
    },
  },
};
`,
  };
}

export function generateCSSVariables(tokens: DesignTokenSet): TokenOutput {
  const lines: string[] = [':root {'];
  for (const c of tokens.colors) {
    lines.push(`  --${toKebabCase(c.name)}: ${c.value};`);
  }
  for (const s of tokens.spacing) {
    lines.push(`  --${toKebabCase(s.name)}: ${s.value}px;`);
  }
  for (const r of tokens.radius) {
    lines.push(`  --${toKebabCase(r.name)}: ${r.value}px;`);
  }
  lines.push('}');

  return {
    path: 'src/styles/tokens.css',
    language: 'css',
    content: lines.join('\n') + '\n',
  };
}

export function generateReactNativeTheme(tokens: DesignTokenSet): TokenOutput {
  const colors: Record<string, string> = {};
  const spacing: Record<string, number> = {};

  for (const c of tokens.colors) {
    colors[toCamelCase(c.name)] = c.value;
  }
  for (const s of tokens.spacing) {
    spacing[toCamelCase(s.name)] = s.value;
  }

  return {
    path: 'src/theme/tokens.ts',
    language: 'typescript',
    content: `/** Auto-generated design tokens */
export const colors = ${JSON.stringify(colors, null, 2)} as const;

export const spacing = ${JSON.stringify(spacing, null, 2)} as const;

export const theme = { colors, spacing } as const;
`,
  };
}

function toCamelCase(str: string): string {
  return str.replace(/[-_](.)/g, (_, c: string) => c.toUpperCase()).replace(/^./, (c) => c.toLowerCase());
}

function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[_\s]/g, '-').toLowerCase();
}
