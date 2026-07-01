import type {
  DesignDocument,
  DesignNode,
  ComponentType,
  DetectedComponentRef,
  ScreenRef,
} from '@design2code/design-ast';
import { walkAST } from '@design2code/design-ast';
import { DETECTION_PATTERNS, type DetectionPattern } from './patterns.js';

export interface DetectionResult {
  components: DetectedComponentRef[];
  screens: ScreenRef[];
}

export class ComponentDetector {
  detect(document: DesignDocument): DetectionResult {
    const components: DetectedComponentRef[] = [];
    const screens: ScreenRef[] = [];

    walkAST(document.root, (node) => {
      const detection = this.detectNode(node);
      if (detection) {
        node.semanticType = detection.type;
        components.push({
          id: `comp-${node.id}`,
          type: detection.type,
          name: this.sanitizeComponentName(node.name, detection.type),
          nodeId: node.id,
          confidence: node.type === 'instance' ? 0.95 : detection.confidence,
          reusable: node.type === 'instance' || detection.confidence >= 0.8,
        });
      }

      if (this.isScreen(node)) {
        screens.push({
          id: `screen-${node.id}`,
          name: node.name,
          nodeId: node.id,
          route: this.inferRoute(node.name),
        });
      }
    });

    return { components, screens };
  }

  private detectNode(node: DesignNode): { type: ComponentType; confidence: number } | null {
    if (node.semanticType && node.semanticType !== 'unknown') {
      return { type: node.semanticType, confidence: 1 };
    }

    let bestMatch: { type: ComponentType; confidence: number } | null = null;

    for (const pattern of DETECTION_PATTERNS) {
      const score = this.matchPattern(node, pattern);
      if (score > 0 && (!bestMatch || score > bestMatch.confidence)) {
        bestMatch = { type: pattern.type, confidence: score };
      }
    }

    return bestMatch;
  }

  private matchPattern(node: DesignNode, pattern: DetectionPattern): number {
    let score = 0;

    for (const regex of pattern.namePatterns) {
      if (regex.test(node.name)) {
        score = pattern.confidence;
        break;
      }
    }

    if (score === 0) return 0;

    if (pattern.requiresText && !node.text && !this.hasTextChild(node)) {
      score *= 0.5;
    }
    if (pattern.minChildren !== undefined && node.children.length < pattern.minChildren) {
      score *= 0.6;
    }
    if (pattern.maxChildren !== undefined && node.children.length > pattern.maxChildren) {
      score *= 0.7;
    }
    if (pattern.layoutMode && !pattern.layoutMode.includes(node.layout.mode)) {
      score *= 0.8;
    }

    return score;
  }

  private hasTextChild(node: DesignNode): boolean {
    return node.children.some((c) => c.type === 'text' || c.text || this.hasTextChild(c));
  }

  private isScreen(node: DesignNode): boolean {
    return (
      node.type === 'frame' &&
      (node.name.toLowerCase().includes('screen') ||
        node.name.toLowerCase().includes('page') ||
        node.layout.width?.kind === 'fill')
    );
  }

  private inferRoute(name: string): string {
    return (
      '/' +
      name
        .toLowerCase()
        .replace(/screen|page/gi, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    );
  }

  private sanitizeComponentName(name: string, type: ComponentType): string {
    const cleaned = name
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length > 0) return cleaned;
    return type
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
  }
}

export function detectComponents(document: DesignDocument): DetectionResult {
  const detector = new ComponentDetector();
  const result = detector.detect(document);
  document.components = result.components;
  document.screens = result.screens;
  return result;
}
