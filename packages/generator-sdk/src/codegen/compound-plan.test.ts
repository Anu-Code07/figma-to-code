import { describe, it, expect } from 'vitest';
import { createDesignNode, DesignASTBuilder } from '@design2code/design-ast';
import { planCompoundComponents, ComponentRegistry } from './compound-plan.js';

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
});
