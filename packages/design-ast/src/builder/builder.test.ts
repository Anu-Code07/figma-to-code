import { describe, it, expect } from 'vitest';
import { createDesignNode, DesignASTBuilder } from './index.js';

describe('DesignASTBuilder', () => {
  it('builds a valid design document', () => {
    const root = createDesignNode({
      id: 'root',
      type: 'frame',
      name: 'Home Screen',
      layout: { mode: 'vertical' },
      style: {},
    });

    const doc = new DesignASTBuilder()
      .setName('Test App')
      .setRoot(root)
      .build();

    expect(doc.version).toBe('1.0');
    expect(doc.name).toBe('Test App');
    expect(doc.root.name).toBe('Home Screen');
    expect(doc.metadata.frameCount).toBe(1);
  });
});
