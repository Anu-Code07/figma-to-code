import { describe, it, expect } from 'vitest';
import { createDesignNode, DesignASTBuilder } from '@design2code/design-ast';
import {
  planCompoundComponents,
  ComponentRegistry,
  getReferencedImports,
} from './compound-plan.js';

describe('planCompoundComponents', () => {
  it('extracts reusable semantic children as compound sub-components', () => {
    const root = createDesignNode({
      id: 'root',
      type: 'frame',
      name: 'Login Screen',
      layout: { mode: 'vertical' },
      style: {},
      children: [
        createDesignNode({
          id: 'header-1',
          type: 'frame',
          name: 'Navbar',
          semanticType: 'navbar',
          layout: { mode: 'horizontal' },
          style: {},
          children: [],
        }),
        createDesignNode({
          id: 'btn-1',
          type: 'component',
          name: 'Login Button',
          semanticType: 'button',
          layout: { mode: 'none' },
          style: { backgroundColor: { hex: '#6366F1' } },
          text: { content: 'Sign In' },
          children: [],
        }),
      ],
    });

    const document = new DesignASTBuilder().setName('Login').setRoot(root).build();
    document.components = [
      { id: 'c1', type: 'navbar', name: 'Navbar', nodeId: 'header-1', confidence: 0.9, reusable: true },
      { id: 'c2', type: 'button', name: 'Login Button', nodeId: 'btn-1', confidence: 0.95, reusable: true },
    ];

    const plan = planCompoundComponents(root, document);
    expect(plan.rootName).toBe('LoginScreen');
    expect(plan.components).toHaveLength(2);
    expect(plan.components.map((c) => c.name)).toEqual(['Navbar', 'LoginButton']);

    const registry = new ComponentRegistry(plan);
    registry.setGeneratingNodeId('root');
    expect(registry.shouldReference('btn-1')).toBe(true);
    expect(registry.shouldReference('root')).toBe(false);
  });

  it('does not extract plain text nodes', () => {
    const root = createDesignNode({
      id: 'root',
      type: 'frame',
      name: 'Card',
      layout: { mode: 'vertical' },
      style: {},
      children: [
        createDesignNode({
          id: 'text-1',
          type: 'text',
          name: 'Label',
          layout: { mode: 'none' },
          style: {},
          text: { content: 'Hello' },
          children: [],
        }),
      ],
    });

    const document = new DesignASTBuilder().setName('Card').setRoot(root).build();
    const plan = planCompoundComponents(root, document);
    expect(plan.components).toHaveLength(0);
  });

  it('deduplicates Figma instances by componentId', () => {
    const makeInstance = (id: string) =>
      createDesignNode({
        id,
        type: 'instance',
        name: 'Primary Button',
        layout: { mode: 'none' },
        style: { backgroundColor: { hex: '#6366F1' } },
        text: { content: 'Click' },
        children: [],
        metadata: { componentId: 'figma-master-1' },
      });

    const root = createDesignNode({
      id: 'root',
      type: 'frame',
      name: 'Screen',
      layout: { mode: 'vertical' },
      style: {},
      children: [makeInstance('inst-1'), makeInstance('inst-2')],
    });

    const document = new DesignASTBuilder().setName('Screen').setRoot(root).build();
    document.metadata.figmaComponents = {
      'figma-master-1': { name: 'Primary Button' },
    };

    const plan = planCompoundComponents(root, document);
    expect(plan.components).toHaveLength(1);
    expect(plan.components[0]!.name).toBe('PrimaryButton');
    expect(plan.aliases['inst-2']).toBe('inst-1');

    const registry = new ComponentRegistry(plan);
    registry.setGeneratingNodeId('root');
    expect(registry.getComponentName('inst-2')).toBe('PrimaryButton');
    expect(registry.shouldReference('inst-2')).toBe(true);
  });

  it('collects only referenced imports, not nested compound children', () => {
    const root = createDesignNode({
      id: 'root',
      type: 'frame',
      name: 'Product Card',
      semanticType: 'card',
      layout: { mode: 'vertical' },
      style: {},
      children: [
        createDesignNode({
          id: 'section-1',
          type: 'frame',
          name: 'Actions',
          semanticType: 'card',
          layout: { mode: 'vertical' },
          style: {},
          children: [
            createDesignNode({
              id: 'btn-nested',
              type: 'component',
              name: 'Buy Button',
              semanticType: 'button',
              layout: { mode: 'none' },
              style: {},
              text: { content: 'Buy' },
              children: [],
            }),
          ],
        }),
        createDesignNode({
          id: 'btn-top',
          type: 'component',
          name: 'Close Button',
          semanticType: 'button',
          layout: { mode: 'none' },
          style: {},
          text: { content: 'Close' },
          children: [],
        }),
      ],
    });

    const document = new DesignASTBuilder().setName('Shop').setRoot(root).build();
    document.components = [
      { id: 'c1', type: 'card', name: 'Actions', nodeId: 'section-1', confidence: 0.9, reusable: true },
      { id: 'c2', type: 'button', name: 'Buy Button', nodeId: 'btn-nested', confidence: 0.95, reusable: true },
      { id: 'c3', type: 'button', name: 'Close Button', nodeId: 'btn-top', confidence: 0.95, reusable: true },
    ];

    const plan = planCompoundComponents(root, document);
    const registry = new ComponentRegistry(plan);
    registry.setGeneratingNodeId('root');

    const imports = getReferencedImports(root, registry, plan, (c) => c.name);
    expect(imports).toContain('Actions');
    expect(imports).toContain('CloseButton');
    expect(imports).not.toContain('BuyButton');
  });
});
