import type { DesignDocument, DesignNode } from '@figma-to-code/design-ast';
import { walkAST, findNodes } from '@figma-to-code/design-ast';

export interface AIProvider {
  name: string;
  complete(prompt: string, options?: AICompletionOptions): Promise<string>;
}

export interface AICompletionOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface AIEngineConfig {
  provider?: AIProvider;
  enabled?: boolean;
}

export class AIEngine {
  private provider?: AIProvider;
  private enabled: boolean;

  constructor(config: AIEngineConfig = {}) {
    this.provider = config.provider;
    this.enabled = config.enabled ?? true;
  }

  async optimize(document: DesignDocument): Promise<DesignDocument> {
    if (!this.enabled) return document;

    let optimized = { ...document, root: structuredClone(document.root) };

    optimized = this.reduceNesting(optimized);
    optimized = this.improveNaming(optimized);
    optimized = this.extractDuplicates(optimized);
    optimized = this.improveAccessibility(optimized);
    optimized = this.replaceMagicNumbers(optimized);

    if (this.provider) {
      optimized = await this.aiEnhance(optimized);
    }

    return optimized;
  }

  private reduceNesting(document: DesignDocument): DesignDocument {
    const root = structuredClone(document.root);
    this.flattenRedundantGroups(root);
    return { ...document, root };
  }

  private flattenRedundantGroups(node: DesignNode): void {
    for (const child of node.children) {
      this.flattenRedundantGroups(child);
    }

    node.children = node.children.flatMap((child) => {
      if (
        child.type === 'group' &&
        child.children.length === 1 &&
        !child.text &&
        !child.style.backgroundColor
      ) {
        return child.children;
      }
      return [child];
    });
  }

  private improveNaming(document: DesignDocument): DesignDocument {
    const root = structuredClone(document.root);
    walkAST(root, (node) => {
      if (/^(frame|group|rectangle)\s*\d*$/i.test(node.name)) {
        if (node.semanticType) {
          node.name = toPascalCase(node.semanticType);
        } else if (node.text?.content) {
          node.name = toPascalCase(node.text.content.slice(0, 30));
        }
      }
    });
    return { ...document, root };
  }

  private extractDuplicates(document: DesignDocument): DesignDocument {
    const root = structuredClone(document.root);
    const signatures = new Map<string, DesignNode[]>();

    walkAST(root, (node) => {
      if (node.type === 'component' || node.type === 'instance' || node.semanticType) {
        const sig = this.nodeSignature(node);
        const existing = signatures.get(sig) ?? [];
        existing.push(node);
        signatures.set(sig, existing);
      }
    });

    for (const [, nodes] of signatures) {
      if (nodes.length > 1) {
        for (const node of nodes) {
          node.metadata = { ...node.metadata, isReusable: true, duplicateOf: nodes[0].id };
        }
      }
    }

    return { ...document, root };
  }

  private improveAccessibility(document: DesignDocument): DesignDocument {
    const root = structuredClone(document.root);
    walkAST(root, (node) => {
      if (node.semanticType === 'button' && !node.accessibility?.label) {
        const textChild = findNodes(node, (n) => !!n.text?.content)[0];
        node.accessibility = {
          ...node.accessibility,
          label: textChild?.text?.content ?? node.name,
          role: 'button',
          isFocusable: true,
        };
      }
      if (node.type === 'image' && !node.accessibility?.label) {
        node.accessibility = {
          ...node.accessibility,
          label: node.asset?.alt ?? node.name,
          role: 'img',
        };
      }
    });
    return { ...document, root };
  }

  private replaceMagicNumbers(document: DesignDocument): DesignDocument {
    const root = structuredClone(document.root);
    const tokens = document.tokens;

    walkAST(root, (node) => {
      if (node.layout.gap !== undefined) {
        const spacingToken = tokens.spacing.find((s) => s.value === node.layout.gap);
        if (spacingToken) {
          node.metadata = { ...node.metadata, gapToken: spacingToken.name };
        }
      }
      const bg = node.style.backgroundColor;
      if (bg?.hex) {
        const colorToken = tokens.colors.find((c) => c.value.toLowerCase() === bg.hex.toLowerCase());
        if (colorToken) {
          node.style.backgroundColor = { ...bg, token: colorToken.name };
        }
      }
    });

    return { ...document, root };
  }

  private async aiEnhance(document: DesignDocument): Promise<DesignDocument> {
    if (!this.provider) return document;

    const prompt = `Analyze this Design AST and suggest improvements for code generation:
${JSON.stringify({ name: document.name, components: document.components, screens: document.screens }, null, 2)}

Respond with JSON: { "suggestions": string[], "componentNames": Record<string, string> }`;

    try {
      const response = await this.provider.complete(prompt, {
        systemPrompt:
          'You are a senior frontend architect optimizing design-to-code output. Respond only with valid JSON.',
        temperature: 0.3,
      });
      const parsed = JSON.parse(response) as {
        suggestions?: string[];
        componentNames?: Record<string, string>;
      };

      const root = structuredClone(document.root);
      if (parsed.componentNames) {
        walkAST(root, (node) => {
          if (parsed.componentNames![node.id]) {
            node.name = parsed.componentNames![node.id];
          }
        });
      }

      return {
        ...document,
        root,
        metadata: {
          ...document.metadata,
          aiSuggestions: parsed.suggestions ?? [],
        },
      };
    } catch {
      return document;
    }
  }

  private nodeSignature(node: DesignNode): string {
    return JSON.stringify({
      type: node.semanticType ?? node.type,
      childCount: node.children.length,
      layout: node.layout.mode,
      hasText: !!node.text,
    });
  }
}

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

export function createAIEngine(config?: AIEngineConfig): AIEngine {
  return new AIEngine(config);
}
