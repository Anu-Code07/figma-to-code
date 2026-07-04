import type {
  DesignDocument,
  DesignNode,
  ColorValue,
} from '@figma-to-code/design-ast';
import type {
  DesignTokenSet,
  ColorToken,
  TypographyToken,
  SpacingToken,
  RadiusToken,
  ShadowToken,
} from '@figma-to-code/design-ast';
import { createEmptyTokenSet } from '@figma-to-code/design-ast';
import { flattenAST } from '@figma-to-code/design-ast';

const SPACING_SCALE = [0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96];

export class TokenExtractor {
  extract(document: DesignDocument): DesignTokenSet {
    const tokens = createEmptyTokenSet();
    const nodes = flattenAST(document.root);

    const colorMap = new Map<string, ColorToken>();
    const typographyMap = new Map<string, TypographyToken>();
    const spacingSet = new Set<number>();
    const radiusSet = new Set<number>();
    const shadowMap = new Map<string, ShadowToken>();

    for (const node of nodes) {
      this.extractColors(node, colorMap);
      this.extractTypography(node, typographyMap);
      this.extractSpacing(node, spacingSet);
      this.extractRadius(node, radiusSet);
      this.extractShadows(node, shadowMap);
    }

    tokens.colors = Array.from(colorMap.values());
    tokens.typography = Array.from(typographyMap.values());
    tokens.spacing = this.normalizeSpacing(Array.from(spacingSet));
    tokens.radius = this.normalizeRadius(Array.from(radiusSet));
    tokens.shadows = Array.from(shadowMap.values());

    return tokens;
  }

  private extractColors(node: DesignNode, map: Map<string, ColorToken>): void {
    const colors: (ColorValue | undefined)[] = [
      node.style.backgroundColor,
      node.style.foregroundColor,
      node.style.borderColor,
      node.text?.color,
    ];

    for (const color of colors) {
      if (!color?.hex) continue;
      const name = this.colorName(color.hex);
      if (!map.has(name)) {
        map.set(name, {
          name,
          value: color.hex,
          category: this.inferColorCategory(name),
        });
      }
    }
  }

  private extractTypography(node: DesignNode, map: Map<string, TypographyToken>): void {
    if (!node.text) return;
    const { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing } = node.text;
    if (!fontFamily || !fontSize) return;

    const name = `text-${this.sanitizeName(fontFamily)}-${fontSize}`;
    if (!map.has(name)) {
      map.set(name, {
        name,
        fontFamily,
        fontSize,
        fontWeight: fontWeight ?? 400,
        lineHeight: lineHeight ?? fontSize * 1.5,
        letterSpacing,
      });
    }
  }

  private extractSpacing(node: DesignNode, set: Set<number>): void {
    const { padding, margin, gap } = node.layout;
    if (padding) {
      set.add(padding.top);
      set.add(padding.right);
      set.add(padding.bottom);
      set.add(padding.left);
    }
    if (margin) {
      set.add(margin.top);
      set.add(margin.right);
      set.add(margin.bottom);
      set.add(margin.left);
    }
    if (gap !== undefined) set.add(gap);
  }

  private extractRadius(node: DesignNode, set: Set<number>): void {
    const radius = node.style.borderRadius;
    if (!radius) return;
    set.add(radius.topLeft);
    set.add(radius.topRight);
    set.add(radius.bottomRight);
    set.add(radius.bottomLeft);
  }

  private extractShadows(node: DesignNode, map: Map<string, ShadowToken>): void {
    const shadow = node.style.shadow;
    if (!shadow) return;
    const name = `shadow-${shadow.offsetY}`;
    if (!map.has(name)) {
      map.set(name, {
        name,
        offsetX: shadow.offsetX,
        offsetY: shadow.offsetY,
        blur: shadow.blur,
        spread: shadow.spread,
        color: shadow.color.hex,
      });
    }
  }

  private normalizeSpacing(values: number[]): SpacingToken[] {
    const unique = [...new Set(values.filter((v) => v > 0))].sort((a, b) => a - b);
    return unique.map((value, i) => ({
      name: `spacing-${SPACING_SCALE.includes(value) ? value : i + 1}`,
      value,
    }));
  }

  private normalizeRadius(values: number[]): RadiusToken[] {
    const unique = [...new Set(values.filter((v) => v > 0))].sort((a, b) => a - b);
    return unique.map((value, i) => ({
      name: value === 9999 ? 'radius-full' : `radius-${i + 1}`,
      value: value === 9999 ? 9999 : value,
    }));
  }

  private colorName(hex: string): string {
    return `color-${hex.replace('#', '').toLowerCase()}`;
  }

  private inferColorCategory(name: string): ColorToken['category'] {
    if (name.includes('ffffff') || name.includes('f5f5')) return 'background';
    if (name.includes('000000') || name.includes('1a1a')) return 'text';
    return 'other';
  }

  private sanitizeName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }
}

export function extractTokens(document: DesignDocument): DesignTokenSet {
  return new TokenExtractor().extract(document);
}
