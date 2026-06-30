import type { DesignTokenSet } from '@design2code/design-ast';

export interface TokenResolverOptions {
  framework: 'flutter' | 'react' | 'nextjs' | 'react-native';
}

export class TokenResolver {
  private colorMap = new Map<string, string>();
  private spacingMap = new Map<number, string>();
  private radiusMap = new Map<number, string>();

  constructor(
    tokens: DesignTokenSet,
    private options: TokenResolverOptions,
  ) {
    for (const c of tokens.colors) {
      this.colorMap.set(c.value.toLowerCase(), c.name);
    }
    for (const s of tokens.spacing) {
      this.spacingMap.set(s.value, s.name);
    }
    for (const r of tokens.radius) {
      this.radiusMap.set(r.value, r.name);
    }
  }

  color(hex?: string, fallback = 'primary'): string {
    if (!hex) return this.colorToken(fallback);
    const name = this.colorMap.get(hex.toLowerCase());
    return name ? this.colorToken(name) : this.rawColor(hex);
  }

  spacing(value: number, _fallback = 'md'): string {
    const name = this.spacingMap.get(value);
    return name ? this.spacingToken(name) : String(value);
  }

  radius(value: number, _fallback = 'md'): string {
    const name = this.radiusMap.get(value);
    return name ? this.radiusToken(name) : String(value);
  }

  private colorToken(name: string): string {
    const id = this.toTokenId(name);
    switch (this.options.framework) {
      case 'flutter':
        return `AppColors.${id}`;
      case 'react':
      case 'nextjs':
        return `var(--color-${this.toKebab(name)})`;
      case 'react-native':
        return `theme.colors.${id}`;
    }
  }

  private spacingToken(name: string): string {
    const id = this.toTokenId(name);
    switch (this.options.framework) {
      case 'flutter':
        return `AppSpacing.${id}`;
      case 'react':
      case 'nextjs':
        return `var(--spacing-${this.toKebab(name)})`;
      case 'react-native':
        return `theme.spacing.${id}`;
    }
  }

  private radiusToken(name: string): string {
    const id = this.toTokenId(name);
    switch (this.options.framework) {
      case 'flutter':
        return `AppRadius.${id}`;
      case 'react':
      case 'nextjs':
        return `var(--radius-${this.toKebab(name)})`;
      case 'react-native':
        return `theme.radius.${id}`;
    }
  }

  private rawColor(hex: string): string {
    const clean = hex.replace('#', '');
    switch (this.options.framework) {
      case 'flutter':
        return `Color(0xFF${clean})`;
      case 'react':
      case 'nextjs':
        return hex;
      case 'react-native':
        return `'${hex}'`;
    }
  }

  private toTokenId(name: string): string {
    return name
      .replace(/^color-/, '')
      .replace(/^spacing-/, '')
      .replace(/^radius-/, '')
      .replace(/[-_](.)/g, (_, c: string) => c.toUpperCase())
      .replace(/^./, (c) => c.toLowerCase());
  }

  private toKebab(name: string): string {
    return name.replace(/[_\s]/g, '-').toLowerCase();
  }
}
