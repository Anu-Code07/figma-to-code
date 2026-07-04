import type { DesignSystemConfig } from '@figma-to-code/design-ast';
import type { DesignTokenSet } from '@figma-to-code/design-ast';
import { createEmptyTokenSet } from '@figma-to-code/design-ast';

/**
 * Merges design.md token definitions with extracted Figma tokens.
 * Design system config takes precedence for matching names.
 */
export function mergeWithDesignSystem(
  extracted: DesignTokenSet,
  config: DesignSystemConfig,
): DesignTokenSet {
  const merged = { ...extracted };

  if (config.colors) {
    for (const [name, value] of Object.entries(config.colors)) {
      const existing = merged.colors.find((c) => c.name === name);
      if (existing) {
        existing.value = value;
      } else {
        merged.colors.push({ name, value });
      }
    }
  }

  if (config.typography) {
    for (const [name, typo] of Object.entries(config.typography)) {
      const existing = merged.typography.find((t) => t.name === name);
      if (existing) {
        Object.assign(existing, typo);
      } else {
        merged.typography.push({
          name,
          fontFamily: typo.fontFamily,
          fontSize: typo.fontSize,
          fontWeight: typo.fontWeight ?? 400,
          lineHeight: typo.lineHeight ?? typo.fontSize * 1.5,
          letterSpacing: typo.letterSpacing,
        });
      }
    }
  }

  if (config.spacing) {
    for (const [name, value] of Object.entries(config.spacing)) {
      if (!merged.spacing.find((s) => s.name === name)) {
        merged.spacing.push({ name, value });
      }
    }
  }

  if (config.radius) {
    for (const [name, value] of Object.entries(config.radius)) {
      if (!merged.radius.find((r) => r.name === name)) {
        merged.radius.push({ name, value });
      }
    }
  }

  return merged;
}

export function tokensFromDesignSystem(config: DesignSystemConfig): DesignTokenSet {
  const tokens = createEmptyTokenSet();

  if (config.colors) {
    tokens.colors = Object.entries(config.colors).map(([name, value]) => ({ name, value }));
  }
  if (config.typography) {
    tokens.typography = Object.entries(config.typography).map(([name, typo]) => ({
      name,
      fontFamily: typo.fontFamily,
      fontSize: typo.fontSize,
      fontWeight: typo.fontWeight ?? 400,
      lineHeight: typo.lineHeight ?? typo.fontSize * 1.5,
      letterSpacing: typo.letterSpacing,
    }));
  }
  if (config.spacing) {
    tokens.spacing = Object.entries(config.spacing).map(([name, value]) => ({ name, value }));
  }
  if (config.radius) {
    tokens.radius = Object.entries(config.radius).map(([name, value]) => ({ name, value }));
  }

  return tokens;
}
