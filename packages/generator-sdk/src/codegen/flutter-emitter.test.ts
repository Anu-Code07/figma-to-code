import { describe, it, expect } from 'vitest';
import { createDesignNode } from '@figma-to-code/design-ast';
import { FlutterFidelityEmitter } from './emitters/flutter-emitter.js';
import { createEmptyTokenSet } from '@figma-to-code/design-ast';

describe('FlutterFidelityEmitter', () => {
  const tokens = createEmptyTokenSet();
  tokens.colors = [
    { name: 'color237804', value: '#237804', category: 'other' },
    { name: 'primary', value: '#6366F1', category: 'other' },
  ];

  it('emits mainAxisAlignment not MainAxisAlignment as param name', () => {
    const root = createDesignNode({
      id: 'col',
      type: 'frame',
      name: 'Column',
      layout: { mode: 'vertical', gap: 8 },
      style: {},
      children: [
        createDesignNode({
          id: 't1',
          type: 'text',
          name: 'Title',
          layout: { mode: 'none' },
          style: {},
          text: { content: 'Hello' },
          children: [],
        }),
        createDesignNode({
          id: 't2',
          type: 'text',
          name: 'Sub',
          layout: { mode: 'none' },
          style: {},
          text: { content: 'World' },
          children: [],
        }),
      ],
    });

    const emitter = new FlutterFidelityEmitter(tokens);
    const code = emitter.renderNode(root, 0);
    expect(code).toContain('mainAxisAlignment:');
    expect(code).toContain('crossAxisAlignment:');
    expect(code).not.toMatch(/\n\s+MainAxisAlignment:/);
  });

  it('emits Stack + Positioned for absolute layout banner', () => {
    const root = createDesignNode({
      id: 'banner',
      type: 'frame',
      name: 'Promo Banner',
      layout: { mode: 'absolute', width: { kind: 'fixed', value: 360 }, height: { kind: 'fixed', value: 120 } },
      style: {
        gradient: {
          type: 'linear',
          stops: [
            { offset: 0, color: '#237804' },
            { offset: 1, color: '#3c5d3e' },
          ],
        },
      },
      children: [
        createDesignNode({
          id: 'title',
          type: 'text',
          name: 'Title',
          layout: { mode: 'none', position: 'absolute', left: 16, top: 20 },
          style: {},
          text: { content: 'Save 20%' },
          children: [],
        }),
        createDesignNode({
          id: 'img',
          type: 'image',
          name: 'Hero',
          layout: { mode: 'none', position: 'absolute', left: 200, top: 10 },
          style: { backgroundImageRef: 'abc123' },
          asset: { url: 'figma://abc123', format: 'png' },
          children: [],
        }),
      ],
    });

    const emitter = new FlutterFidelityEmitter(tokens);
    const code = emitter.renderNode(root, 0);
    expect(code).toContain('Stack(');
    expect(code).toContain('Positioned(');
    expect(code).toContain('LinearGradient(');
    expect(code).toContain('FigmaAssets.image_abc123');
    expect(code).not.toContain('AppColors.3c5d3e');
    expect(code).not.toContain('Color 237804');
  });
});
