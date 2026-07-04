import { readFile } from 'node:fs/promises';
import type { DesignSystemConfig } from '@figma-to-code/design-ast';

/**
 * Parses design.md — a markdown file describing the project's design system.
 *
 * Example design.md:
 * ```md
 * # Design System: Acme App
 *
 * ## Framework
 * - framework: flutter
 * - architecture: clean-architecture
 * - state: bloc
 * - ui: material3
 *
 * ## Colors
 * - primary: #6366F1
 * - secondary: #8B5CF6
 *
 * ## Typography
 * - heading-lg: Inter 32px 700
 * - body-md: Inter 16px 400
 *
 * ## Spacing
 * - xs: 4
 * - sm: 8
 * - md: 16
 *
 * ## Components
 * - Button: lib/shared/widgets/button.dart
 * ```
 */
export async function parseDesignMd(filePath: string): Promise<DesignSystemConfig> {
  const content = await readFile(filePath, 'utf-8');
  return parseDesignMdContent(content);
}

export function parseDesignMdContent(content: string): DesignSystemConfig {
  const config: DesignSystemConfig = {
    name: 'Default',
    colors: {},
    typography: {},
    spacing: {},
    radius: {},
    components: [],
    rules: [],
  };

  const lines = content.split('\n');
  let section = '';

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('# ')) {
      config.name = trimmed.slice(2).replace(/^Design System:\s*/i, '').trim();
      continue;
    }

    if (trimmed.startsWith('## ')) {
      section = trimmed.slice(3).toLowerCase();
      continue;
    }

    if (!trimmed.startsWith('- ')) continue;
    const item = trimmed.slice(2);

    switch (section) {
      case 'framework':
        parseFrameworkItem(item, config);
        break;
      case 'colors':
        parseKeyValue(item, config.colors!);
        break;
      case 'typography':
        parseTypography(item, config);
        break;
      case 'spacing':
        parseKeyValueNumber(item, config.spacing!);
        break;
      case 'radius':
        parseKeyValueNumber(item, config.radius!);
        break;
      case 'components':
        parseComponent(item, config);
        break;
      case 'rules':
        config.rules!.push(item);
        break;
      case 'naming':
        parseNaming(item, config);
        break;
      case 'folders':
        parseFolders(item, config);
        break;
    }
  }

  return config;
}

function parseFrameworkItem(item: string, config: DesignSystemConfig): void {
  const [key, value] = item.split(':').map((s) => s.trim());
  switch (key) {
    case 'framework':
      config.framework = value as DesignSystemConfig['framework'];
      break;
    case 'architecture':
      config.architecture = value as DesignSystemConfig['architecture'];
      break;
    case 'state':
    case 'stateManagement':
      config.stateManagement = value as DesignSystemConfig['stateManagement'];
      break;
    case 'ui':
    case 'uiLibrary':
      config.uiLibrary = value as DesignSystemConfig['uiLibrary'];
      break;
    case 'routing':
      config.routing = value;
      break;
  }
}

function parseKeyValue(item: string, target: Record<string, string>): void {
  const colonIdx = item.indexOf(':');
  if (colonIdx === -1) return;
  const key = item.slice(0, colonIdx).trim();
  const value = item.slice(colonIdx + 1).trim();
  target[key] = value;
}

function parseKeyValueNumber(item: string, target: Record<string, number>): void {
  const colonIdx = item.indexOf(':');
  if (colonIdx === -1) return;
  const key = item.slice(0, colonIdx).trim();
  const value = parseFloat(item.slice(colonIdx + 1).trim());
  if (!isNaN(value)) target[key] = value;
}

function parseTypography(item: string, config: DesignSystemConfig): void {
  const colonIdx = item.indexOf(':');
  if (colonIdx === -1) return;
  const name = item.slice(0, colonIdx).trim();
  const parts = item.slice(colonIdx + 1).trim().split(/\s+/);
  if (parts.length < 2) return;

  const fontSize = parseInt(parts[parts.length - 2].replace('px', ''), 10);
  const fontWeight = parseInt(parts[parts.length - 1], 10) || parts[parts.length - 1];
  const fontFamily = parts.slice(0, -2).join(' ') || parts[0];

  config.typography![name] = {
    fontFamily,
    fontSize: isNaN(fontSize) ? 16 : fontSize,
    fontWeight: isNaN(Number(fontWeight)) ? fontWeight : Number(fontWeight),
  };
}

function parseComponent(item: string, config: DesignSystemConfig): void {
  const colonIdx = item.indexOf(':');
  if (colonIdx === -1) {
    config.components!.push({ name: item });
    return;
  }
  config.components!.push({
    name: item.slice(0, colonIdx).trim(),
    path: item.slice(colonIdx + 1).trim(),
  });
}

function parseNaming(item: string, config: DesignSystemConfig): void {
  const [key, value] = item.split(':').map((s) => s.trim());
  if (!config.naming) config.naming = {};
  if (key === 'components') config.naming.components = value as 'PascalCase';
  if (key === 'files') config.naming.files = value as 'PascalCase';
  if (key === 'folders') config.naming.folders = value as 'kebab-case';
}

function parseFolders(item: string, config: DesignSystemConfig): void {
  const [key, value] = item.split(':').map((s) => s.trim());
  if (!config.folderStructure) config.folderStructure = {};
  const map: Record<string, keyof NonNullable<DesignSystemConfig['folderStructure']>> = {
    components: 'components',
    screens: 'screens',
    features: 'features',
    tokens: 'tokens',
    assets: 'assets',
    tests: 'tests',
  };
  if (map[key]) {
    config.folderStructure[map[key]] = value;
  }
}
