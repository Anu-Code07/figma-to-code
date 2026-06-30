/** Supported frontend frameworks */
export type Framework =
  | 'flutter'
  | 'react'
  | 'nextjs'
  | 'react-native'
  | 'vue'
  | 'angular'
  | 'svelte'
  | 'swiftui'
  | 'jetpack-compose'
  | 'ionic'
  | 'solidjs';

/** Generation scope modes */
export type GenerationScope = 'component' | 'screen' | 'feature' | 'project';

/** Merge strategies for existing projects */
export type MergeStrategy = 'create' | 'merge' | 'replace' | 'preview';

/** State management options per framework */
export type StateManagement =
  | 'riverpod'
  | 'bloc'
  | 'redux-toolkit'
  | 'zustand'
  | 'tanstack-query'
  | 'none';

/** UI library options */
export type UILibrary =
  | 'material3'
  | 'cupertino'
  | 'mui'
  | 'shadcn'
  | 'nativewind'
  | 'tailwind'
  | 'css-modules'
  | 'none';

/** Architecture pattern */
export type ArchitecturePattern =
  | 'clean-architecture'
  | 'feature-first'
  | 'atomic-design'
  | 'flat';

export interface CompilerOptions {
  framework: Framework;
  scope: GenerationScope;
  mergeStrategy?: MergeStrategy;
  outputDir?: string;
  projectRoot?: string;
  selection?: string[];
  includeRouting?: boolean;
  includeTests?: boolean;
  includeStorybook?: boolean;
  includeDocs?: boolean;
  designSystemPath?: string;
  figmaFileKey?: string;
  figmaNodeIds?: string[];
  aiEnabled?: boolean;
  dryRun?: boolean;
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
  kind: 'component' | 'screen' | 'feature' | 'project' | 'token' | 'test' | 'story' | 'config' | 'route' | 'asset';
  action: MergeStrategy;
}

export interface GenerationResult {
  files: GeneratedFile[];
  tokens?: import('./tokens.js').DesignTokenSet;
  ast?: DesignDocument;
  warnings: string[];
  metadata: Record<string, unknown>;
}

export interface DesignDocument {
  version: '1.0';
  name: string;
  description?: string;
  root: DesignNode;
  tokens: import('./tokens.js').DesignTokenSet;
  components: DetectedComponentRef[];
  screens: ScreenRef[];
  metadata: DesignMetadata;
}

export interface DesignMetadata {
  figmaFileKey?: string;
  figmaVersion?: string;
  exportedAt: string;
  frameCount: number;
  componentCount: number;
  source: 'figma' | 'screenshot' | 'design-md' | 'manual';
  aiSuggestions?: string[];
}

export interface DetectedComponentRef {
  id: string;
  type: ComponentType;
  name: string;
  nodeId: string;
  confidence: number;
  reusable: boolean;
}

export interface ScreenRef {
  id: string;
  name: string;
  nodeId: string;
  route?: string;
}

export type ComponentType =
  | 'button'
  | 'card'
  | 'text-field'
  | 'search-bar'
  | 'navbar'
  | 'footer'
  | 'pricing-card'
  | 'product-card'
  | 'form'
  | 'dialog'
  | 'bottom-sheet'
  | 'fab'
  | 'hero-section'
  | 'pricing-table'
  | 'auth-form'
  | 'dashboard'
  | 'chart'
  | 'list'
  | 'navigation'
  | 'container'
  | 'text'
  | 'image'
  | 'icon'
  | 'unknown';

export type DesignNodeType =
  | 'document'
  | 'frame'
  | 'group'
  | 'component'
  | 'instance'
  | 'text'
  | 'rectangle'
  | 'ellipse'
  | 'vector'
  | 'image'
  | 'icon'
  | 'input'
  | 'button'
  | 'card'
  | 'list'
  | 'navigation'
  | 'dialog'
  | 'layout';

export interface DesignNode {
  id: string;
  type: DesignNodeType;
  name: string;
  semanticType?: ComponentType;
  children: DesignNode[];
  layout: LayoutProperties;
  style: StyleProperties;
  text?: TextProperties;
  asset?: AssetProperties;
  accessibility?: AccessibilityProperties;
  constraints?: ConstraintProperties;
  metadata?: Record<string, unknown>;
}

export interface LayoutProperties {
  mode: 'none' | 'horizontal' | 'vertical' | 'grid' | 'absolute' | 'stack';
  width?: DimensionValue;
  height?: DimensionValue;
  minWidth?: DimensionValue;
  minHeight?: DimensionValue;
  maxWidth?: DimensionValue;
  maxHeight?: DimensionValue;
  padding?: SpacingValue;
  margin?: SpacingValue;
  gap?: number;
  align?: 'start' | 'center' | 'end' | 'stretch' | 'space-between' | 'space-around';
  justify?: 'start' | 'center' | 'end' | 'stretch' | 'space-between' | 'space-around';
  flex?: number;
  wrap?: boolean;
  gridColumns?: number;
  gridRows?: number;
  position?: 'relative' | 'absolute' | 'fixed' | 'sticky';
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  zIndex?: number;
}

export type DimensionValue =
  | { kind: 'fixed'; value: number }
  | { kind: 'fill' }
  | { kind: 'hug' }
  | { kind: 'percent'; value: number }
  | { kind: 'token'; name: string };

export interface SpacingValue {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface StyleProperties {
  backgroundColor?: ColorValue;
  foregroundColor?: ColorValue;
  borderColor?: ColorValue;
  borderWidth?: number;
  borderRadius?: RadiusValue;
  opacity?: number;
  shadow?: ShadowValue;
  elevation?: number;
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
  blendMode?: string;
}

export interface ColorValue {
  hex: string;
  rgba?: { r: number; g: number; b: number; a: number };
  token?: string;
}

export interface RadiusValue {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
  token?: string;
}

export interface ShadowValue {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: ColorValue;
  token?: string;
}

export interface TextProperties {
  content: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | string;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textDecoration?: 'none' | 'underline' | 'line-through';
  color?: ColorValue;
  typographyToken?: string;
}

export interface AssetProperties {
  url?: string;
  localPath?: string;
  format?: 'png' | 'jpg' | 'svg' | 'webp' | 'pdf';
  scale?: number;
  alt?: string;
}

export interface AccessibilityProperties {
  label?: string;
  hint?: string;
  role?: string;
  isHidden?: boolean;
  isFocusable?: boolean;
  tabIndex?: number;
}

export interface ConstraintProperties {
  horizontal: 'left' | 'right' | 'center' | 'left-right' | 'scale';
  vertical: 'top' | 'bottom' | 'center' | 'top-bottom' | 'scale';
}

export * from './tokens.js';
export * from './design-system.js';
