import { describe, it, expect } from 'vitest';
import { sanitizeDartIdentifier, colorTokenName } from '@figma-to-code/design-ast';

describe('sanitizeDartIdentifier', () => {
  it('converts hex color names to valid Dart ids', () => {
    expect(sanitizeDartIdentifier('color-237804')).toBe('color237804');
    expect(sanitizeDartIdentifier('color-3c5d3e')).toBe('color3c5d3e');
  });

  it('prefixes numeric-leading identifiers', () => {
    expect(sanitizeDartIdentifier('237804')).toBe('c237804');
  });
});

describe('colorTokenName', () => {
  it('prefers semantic style name when provided', () => {
    expect(colorTokenName('#237804', 'primary')).toBe('primary');
  });

  it('falls back to hex-based name', () => {
    expect(colorTokenName('#3c5d3e')).toBe('color3c5d3e');
  });
});
