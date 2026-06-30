import type {
  ArchitecturePattern,
  Framework,
  StateManagement,
  UILibrary,
} from './index.js';

/**
 * Parsed design system configuration from design.md
 */
export interface DesignSystemConfig {
  name: string;
  version?: string;
  description?: string;
  framework?: Framework;
  architecture?: ArchitecturePattern;
  stateManagement?: StateManagement;
  uiLibrary?: UILibrary;
  routing?: string;
  colors?: Record<string, string>;
  typography?: Record<string, TypographyConfig>;
  spacing?: Record<string, number>;
  radius?: Record<string, number>;
  shadows?: Record<string, ShadowConfig>;
  components?: ComponentConvention[];
  naming?: NamingConventions;
  folderStructure?: FolderStructureConfig;
  rules?: string[];
  customTokens?: Record<string, unknown>;
}

export interface TypographyConfig {
  fontFamily: string;
  fontSize: number;
  fontWeight?: number | string;
  lineHeight?: number;
  letterSpacing?: number;
}

export interface ShadowConfig {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread?: number;
  color: string;
}

export interface ComponentConvention {
  name: string;
  path?: string;
  props?: Record<string, string>;
  variants?: string[];
  description?: string;
}

export interface NamingConventions {
  components?: 'PascalCase' | 'kebab-case' | 'snake_case';
  files?: 'PascalCase' | 'kebab-case' | 'snake_case';
  folders?: 'PascalCase' | 'kebab-case' | 'snake_case';
  tokens?: 'camelCase' | 'kebab-case' | 'snake_case';
}

export interface FolderStructureConfig {
  components?: string;
  screens?: string;
  features?: string;
  tokens?: string;
  assets?: string;
  tests?: string;
}
