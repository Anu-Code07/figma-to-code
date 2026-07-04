import type { DesignDocument, DesignNode } from '@figma-to-code/design-ast';
import { walkAST } from '@figma-to-code/design-ast';
import type { AIProvider } from './optimizer.js';

export interface UIFidelityEnhancerConfig {
  provider?: AIProvider;
  enabled?: boolean;
}

/**
 * AI-powered UI fidelity pass — refines layout, spacing, and visual properties
 * to match Figma designs more closely. Requires Claude or OpenAI API key.
 *
 * Used by: CLI (API key from config / ~/.zshrc / prompt) and MCP (host LLM via sampling)
 */
export class UIFidelityEnhancer {
  private provider?: AIProvider;
  private enabled: boolean;

  constructor(config: UIFidelityEnhancerConfig = {}) {
    this.provider = config.provider;
    this.enabled = config.enabled ?? true;
  }

  async enhance(document: DesignDocument): Promise<DesignDocument> {
    if (!this.enabled || !this.provider) return document;

    const lowFidelityNodes: Array<{ id: string; name: string; issues: string[] }> = [];

    walkAST(document.root, (node) => {
      const issues = this.detectIssues(node);
      if (issues.length > 0) {
        lowFidelityNodes.push({ id: node.id, name: node.name, issues });
      }
    });

    if (lowFidelityNodes.length === 0) return document;

    try {
      const prompt = `You are a pixel-perfect UI engineer. Analyze these Figma AST nodes with fidelity issues and return JSON corrections.

Nodes with issues:
${JSON.stringify(lowFidelityNodes.slice(0, 20), null, 2)}

Design tokens available: ${document.tokens.colors.length} colors, ${document.tokens.spacing.length} spacing values.

Return JSON: {
  "corrections": Record<string, { "gap"?: number, "padding"?: {top,right,bottom,left}, "suggestedName"?: string }>,
  "suggestions": string[]
}`;

      const response = await this.provider.complete(prompt, {
        systemPrompt:
          'You improve Figma-to-code fidelity. Return only valid JSON. Preserve exact pixel values from Figma when available.',
        temperature: 0.2,
      });

      const parsed = JSON.parse(response) as {
        corrections?: Record<string, { gap?: number; padding?: { top: number; right: number; bottom: number; left: number }; suggestedName?: string }>;
        suggestions?: string[];
      };

      const root = structuredClone(document.root);
      walkAST(root, (node) => {
        const correction = parsed.corrections?.[node.id];
        if (!correction) return;
        if (correction.gap !== undefined) node.layout.gap = correction.gap;
        if (correction.padding) node.layout.padding = correction.padding;
        if (correction.suggestedName) node.name = correction.suggestedName;
      });

      return {
        ...document,
        root,
        metadata: {
          ...document.metadata,
          aiSuggestions: [
            ...(document.metadata.aiSuggestions ?? []),
            ...(parsed.suggestions ?? []),
          ],
        },
      };
    } catch {
      return document;
    }
  }

  private detectIssues(node: DesignNode): string[] {
    const issues: string[] = [];
    if (node.layout.mode !== 'none' && node.layout.gap === undefined && node.children.length > 1) {
      issues.push('missing gap in auto-layout');
    }
    if (node.layout.mode !== 'none' && !node.layout.padding) {
      issues.push('missing padding');
    }
    if (/^(frame|group|rectangle)\s*\d*$/i.test(node.name)) {
      issues.push('generic naming');
    }
    if (node.style.shadow && !node.style.backgroundColor) {
      issues.push('shadow without background');
    }
    return issues;
  }
}

export function createUIFidelityEnhancer(config?: UIFidelityEnhancerConfig): UIFidelityEnhancer {
  return new UIFidelityEnhancer(config);
}
