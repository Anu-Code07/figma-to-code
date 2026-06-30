import { describe, it, expect } from 'vitest';
import { parseDesignMdContent } from '../src/design-md-parser.js';

describe('parseDesignMdContent', () => {
  it('parses framework configuration', () => {
    const content = `# Design System: Test App

## Framework
- framework: flutter
- architecture: clean-architecture
- state: bloc
- ui: material3

## Colors
- primary: #6366F1
- secondary: #8B5CF6

## Typography
- heading-lg: Inter 32px 700

## Spacing
- md: 16
`;
    const config = parseDesignMdContent(content);
    expect(config.name).toBe('Test App');
    expect(config.framework).toBe('flutter');
    expect(config.architecture).toBe('clean-architecture');
    expect(config.stateManagement).toBe('bloc');
    expect(config.colors?.primary).toBe('#6366F1');
    expect(config.typography?.['heading-lg']?.fontSize).toBe(32);
    expect(config.spacing?.md).toBe(16);
  });
});
