import type { DesignDocument, DesignNode, DetectedComponentRef } from '@design2code/design-ast';
import { walkAST } from '@design2code/design-ast';

/** Semantic types that should become standalone compound sub-components */
const EXTRACTABLE_SEMANTICS = new Set([
  'button',
  'card',
  'navbar',
  'text-field',
  'search-bar',
  'form',
  'dialog',
  'auth-form',
  'hero-section',
  'pricing-card',
  'product-card',
  'footer',
  'fab',
  'bottom-sheet',
]);

export interface ExtractedComponent {
  nodeId: string;
  name: string;
  fileName: string;
  node: DesignNode;
  semanticType?: string;
  depth: number;
}

export interface CompoundPlan {
  root: DesignNode;
  rootName: string;
  rootFileName: string;
  components: ExtractedComponent[];
}

/** Tracks which AST nodes are emitted as separate compound sub-components */
export class ComponentRegistry {
  private readonly extracted = new Map<string, ExtractedComponent>();
  private generatingNodeId: string | null = null;

  constructor(plan: CompoundPlan) {
    for (const component of plan.components) {
      this.extracted.set(component.nodeId, component);
    }
  }

  setGeneratingNodeId(nodeId: string): void {
    this.generatingNodeId = nodeId;
  }

  clearGeneratingNodeId(): void {
    this.generatingNodeId = null;
  }

  isExtracted(nodeId: string): boolean {
    return this.extracted.has(nodeId);
  }

  getExtracted(nodeId: string): ExtractedComponent | undefined {
    return this.extracted.get(nodeId);
  }

  /** True when this node should be referenced instead of inlined */
  shouldReference(nodeId: string): boolean {
    return this.extracted.has(nodeId) && nodeId !== this.generatingNodeId;
  }

  getComponentName(nodeId: string): string {
    return this.extracted.get(nodeId)?.name ?? 'UnknownComponent';
  }

  getAll(): ExtractedComponent[] {
    return [...this.extracted.values()];
  }
}

export function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase()
    .replace(/^-|-$/g, '');
}

export function toSnakeCase(str: string): string {
  return toKebabCase(str).replace(/-/g, '_');
}

/** Build a compound decomposition plan — breaks UI into smaller reusable sub-components */
export function planCompoundComponents(root: DesignNode, document: DesignDocument): CompoundPlan {
  const componentRefs = new Map<string, DetectedComponentRef>(
    document.components.map((c) => [c.nodeId, c]),
  );
  const components: ExtractedComponent[] = [];

  walkAST(root, (node, _parent, depth) => {
    if (node.id === root.id) return;

    const ref = componentRefs.get(node.id);
    if (!shouldExtractNode(node, ref)) return;

    const name = toPascalCase(ref?.name ?? node.name);
    components.push({
      nodeId: node.id,
      name,
      fileName: toKebabCase(name),
      node,
      semanticType: node.semanticType,
      depth,
    });
  });

  // Deepest nodes first so nested compounds generate before parents that reference them
  components.sort((a, b) => b.depth - a.depth);

  const rootName = toPascalCase(root.name);
  return {
    root,
    rootName,
    rootFileName: toKebabCase(rootName),
    components,
  };
}

function shouldExtractNode(node: DesignNode, ref?: DetectedComponentRef): boolean {
  if (node.type === 'text' && !node.semanticType) return false;

  if (ref?.reusable) return true;
  if (node.type === 'component' || node.type === 'instance') return true;
  if (node.metadata?.isReusable === true) return true;
  if (node.semanticType && EXTRACTABLE_SEMANTICS.has(node.semanticType)) return true;

  // Compound container: layout frame with multiple meaningful children
  if (
    node.children.length >= 2 &&
    (node.semanticType === 'card' ||
      node.semanticType === 'form' ||
      node.semanticType === 'auth-form' ||
      node.name.toLowerCase().includes('section'))
  ) {
    return true;
  }

  return false;
}

/** React/Next.js compound namespace export — attaches sub-components to parent */
export function renderReactCompoundBarrel(
  rootName: string,
  subComponents: ExtractedComponent[],
): string {
  if (subComponents.length === 0) {
    return `export { ${rootName} } from './${rootName}';\n`;
  }

  const reExports = [`export { ${rootName} } from './${rootName}';`, ...subComponents.map((c) => `export { ${c.name} } from './${c.name}';`)].join('\n');
  const slots = subComponents
    .map((c) => {
      const slot = c.semanticType
        ? toPascalCase(c.semanticType.replace(/-/g, ' '))
        : c.name.replace(rootName, '') || c.name;
      return `  ${slot}: ${c.name}`;
    })
    .join(',\n');

  return `${reExports}

import { ${rootName} as ${rootName}Base } from './${rootName}';

/** Compound component — compose sub-parts or use namespace slots */
export const ${rootName}Compound = Object.assign(${rootName}Base, {
${slots},
});
`;
}

/** Flutter barrel — re-exports widgets for compound composition */
export function renderFlutterCompoundBarrel(
  rootSnake: string,
  subComponents: ExtractedComponent[],
): string {
  const exports = [
    `export '${rootSnake}.dart';`,
    ...subComponents.map((c) => `export '${toSnakeCase(c.name)}.dart';`),
  ].join('\n');

  return `${exports}\n`;
}
