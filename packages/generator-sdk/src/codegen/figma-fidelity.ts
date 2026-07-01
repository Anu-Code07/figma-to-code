import type { DesignNode, SpacingValue, RadiusValue, ShadowValue } from '@design2code/design-ast';

/** Pixel-perfect style snapshot extracted from Figma Design AST */
export interface FigmaComputedStyle {
  width?: number | '100%' | 'auto';
  height?: number | '100%' | 'auto';
  minWidth?: number;
  minHeight?: number;
  padding?: SpacingValue;
  margin?: SpacingValue;
  gap?: number;
  flexDirection?: 'row' | 'column';
  alignItems?: string;
  justifyContent?: string;
  flexWrap?: boolean;
  backgroundColor?: string;
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: RadiusValue;
  opacity?: number;
  shadow?: ShadowValue;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | string;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: string;
  textDecoration?: string;
  overflow?: string;
}

export class FigmaFidelityEngine {
  /** Extract every visual property from a node for pixel-perfect codegen */
  compute(node: DesignNode): FigmaComputedStyle {
    const style: FigmaComputedStyle = {};

    // Dimensions
    if (node.layout.width?.kind === 'fixed') style.width = node.layout.width.value;
    else if (node.layout.width?.kind === 'fill') style.width = '100%';
    else if (node.layout.width?.kind === 'hug') style.width = 'auto';

    if (node.layout.height?.kind === 'fixed') style.height = node.layout.height.value;
    else if (node.layout.height?.kind === 'fill') style.height = '100%';
    else if (node.layout.height?.kind === 'hug') style.height = 'auto';

    if (node.layout.minWidth?.kind === 'fixed') style.minWidth = node.layout.minWidth.value;
    if (node.layout.minHeight?.kind === 'fixed') style.minHeight = node.layout.minHeight.value;

    // Auto-layout (Figma flex)
    if (node.layout.mode === 'horizontal') {
      style.flexDirection = 'row';
      style.gap = node.layout.gap;
      style.alignItems = mapCrossAxis(node.layout.align);
      style.justifyContent = mapMainAxis(node.layout.justify);
    } else if (node.layout.mode === 'vertical') {
      style.flexDirection = 'column';
      style.gap = node.layout.gap;
      style.alignItems = mapCrossAxis(node.layout.align);
      style.justifyContent = mapMainAxis(node.layout.justify);
    }

    if (node.layout.wrap) style.flexWrap = true;

    // Spacing — exact per-edge from Figma
    if (node.layout.padding && hasSpacing(node.layout.padding)) {
      style.padding = node.layout.padding;
    }
    if (node.layout.margin && hasSpacing(node.layout.margin)) {
      style.margin = node.layout.margin;
    }

    // Visual styles
    if (node.style.backgroundColor?.hex) style.backgroundColor = node.style.backgroundColor.hex;
    if (node.style.borderColor?.hex) style.borderColor = node.style.borderColor.hex;
    if (node.style.borderWidth) style.borderWidth = node.style.borderWidth;
    if (node.style.borderRadius) style.borderRadius = node.style.borderRadius;
    if (node.style.opacity !== undefined && node.style.opacity < 1) style.opacity = node.style.opacity;
    if (node.style.shadow) style.shadow = node.style.shadow;
    if (node.style.overflow) style.overflow = node.style.overflow;

    // Typography
    if (node.text) {
      if (node.text.color?.hex) style.color = node.text.color.hex;
      if (node.text.fontFamily) style.fontFamily = node.text.fontFamily;
      if (node.text.fontSize) style.fontSize = node.text.fontSize;
      if (node.text.fontWeight) style.fontWeight = node.text.fontWeight;
      if (node.text.lineHeight) style.lineHeight = node.text.lineHeight;
      if (node.text.letterSpacing) style.letterSpacing = node.text.letterSpacing;
      if (node.text.textAlign) style.textAlign = node.text.textAlign;
      if (node.text.textDecoration) style.textDecoration = node.text.textDecoration;
    }

    return style;
  }

  /** Fidelity score 0-100 — how complete the Figma data is for this node */
  fidelityScore(node: DesignNode): number {
    let score = 0;
    const s = this.compute(node);
    if (s.width !== undefined) score += 10;
    if (s.height !== undefined) score += 10;
    if (s.padding) score += 15;
    if (s.gap !== undefined) score += 10;
    if (s.backgroundColor) score += 10;
    if (s.borderRadius) score += 10;
    if (s.shadow) score += 10;
    if (s.fontSize) score += 10;
    if (s.flexDirection) score += 15;
    return Math.min(100, score);
  }
}

function hasSpacing(s: SpacingValue): boolean {
  return s.top > 0 || s.right > 0 || s.bottom > 0 || s.left > 0;
}

function mapMainAxis(v?: string): string {
  const map: Record<string, string> = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    'space-between': 'space-between',
    'space-around': 'space-around',
    stretch: 'stretch',
  };
  return map[v ?? 'start'] ?? 'flex-start';
}

function mapCrossAxis(v?: string): string {
  const map: Record<string, string> = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    stretch: 'stretch',
  };
  return map[v ?? 'start'] ?? 'flex-start';
}

export function formatEdgeInsets(s: SpacingValue): string {
  if (s.top === s.right && s.right === s.bottom && s.bottom === s.left) {
    return s.top.toString();
  }
  return `${s.top}, ${s.right}, ${s.bottom}, ${s.left}`;
}

export function formatBorderRadius(r: RadiusValue): string {
  if (r.topLeft === r.topRight && r.topRight === r.bottomRight && r.bottomRight === r.bottomLeft) {
    return r.topLeft.toString();
  }
  return `${r.topLeft}px ${r.topRight}px ${r.bottomRight}px ${r.bottomLeft}px`;
}

export function formatShadow(s: ShadowValue): string {
  const color = s.color.hex ?? '#000000';
  const alpha = s.color.rgba?.a ?? 0.25;
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread}px rgba(${r},${g},${b},${alpha})`;
  }
  return `${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread}px ${color}`;
}
