import type {
  DesignDocument,
  DesignNode,
  DesignTokenSet,
  DesignMetadata,
} from '../types/index.js';
import { createEmptyTokenSet } from '../types/tokens.js';

export class DesignASTBuilder {
  private name = 'Untitled';
  private description?: string;
  private root?: DesignNode;
  private tokens: DesignTokenSet = createEmptyTokenSet();
  private metadata: Partial<DesignMetadata> = {};

  setName(name: string): this {
    this.name = name;
    return this;
  }

  setDescription(description: string): this {
    this.description = description;
    return this;
  }

  setRoot(root: DesignNode): this {
    this.root = root;
    return this;
  }

  setTokens(tokens: DesignTokenSet): this {
    this.tokens = tokens;
    return this;
  }

  mergeTokens(tokens: Partial<DesignTokenSet>): this {
    for (const key of Object.keys(tokens) as (keyof DesignTokenSet)[]) {
      const value = tokens[key];
      if (value) {
        this.tokens[key] = [...this.tokens[key], ...value] as never;
      }
    }
    return this;
  }

  setMetadata(metadata: Partial<DesignMetadata>): this {
    this.metadata = { ...this.metadata, ...metadata };
    return this;
  }

  build(): DesignDocument {
    if (!this.root) {
      throw new Error('Design AST requires a root node');
    }

    return {
      version: '1.0',
      name: this.name,
      description: this.description,
      root: this.root,
      tokens: this.tokens,
      components: [],
      screens: [],
      metadata: {
        exportedAt: new Date().toISOString(),
        frameCount: countNodes(this.root, 'frame'),
        componentCount: countNodes(this.root, 'component'),
        source: 'figma',
        ...this.metadata,
      },
    };
  }
}

function countNodes(node: DesignNode, type: DesignNode['type']): number {
  let count = node.type === type ? 1 : 0;
  for (const child of node.children) {
    count += countNodes(child, type);
  }
  return count;
}

export function createDesignNode(
  partial: Omit<DesignNode, 'children'> & { children?: DesignNode[] },
): DesignNode {
  const { children, layout, style, ...rest } = partial;
  return {
    ...rest,
    layout: { ...(layout ?? {}), mode: layout?.mode ?? 'none' },
    style: { ...(style ?? {}) },
    children: children ?? [],
  };
}
