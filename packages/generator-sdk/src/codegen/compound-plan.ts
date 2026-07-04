import type { DesignDocument, DesignNode, DetectedComponentRef } from '@figma-to-code/design-ast';
import { walkAST } from '@figma-to-code/design-ast';

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
  canonicalNodeId: string;
  name: string;
  fileName: string;
  node: DesignNode;
  semanticType?: string;
  depth: number;
  componentId?: string;
}

export interface CompoundPlan {
  root: DesignNode;
  rootName: string;
  rootFileName: string;
  components: ExtractedComponent[];
  /** Maps duplicate instance node ids to canonical component node ids */
  aliases: Record<string, string>;
}

interface CandidateNode {
  node: DesignNode;
  depth: number;
  ref?: DetectedComponentRef;
}

/** Tracks which AST nodes are emitted as separate compound sub-components */
export class ComponentRegistry {
  private readonly extracted = new Map<string, ExtractedComponent>();
  private readonly aliases = new Map<string, string>();
  private generatingNodeId: string | null = null;

  constructor(plan: CompoundPlan) {
    for (const component of plan.components) {
      this.extracted.set(component.canonicalNodeId, component);
      this.registerAlias(component.nodeId, component.canonicalNodeId);
    }
    for (const [aliasId, canonicalId] of Object.entries(plan.aliases)) {
      this.registerAlias(aliasId, canonicalId);
    }
  }

  registerAlias(nodeId: string, canonicalNodeId: string): void {
    if (nodeId !== canonicalNodeId) {
      this.aliases.set(nodeId, canonicalNodeId);
    }
  }

  resolveNodeId(nodeId: string): string {
    return this.aliases.get(nodeId) ?? nodeId;
  }

  setGeneratingNodeId(nodeId: string): void {
    this.generatingNodeId = nodeId;
  }

  clearGeneratingNodeId(): void {
    this.generatingNodeId = null;
  }

  isExtracted(nodeId: string): boolean {
    return this.extracted.has(this.resolveNodeId(nodeId));
  }

  getExtracted(nodeId: string): ExtractedComponent | undefined {
    return this.extracted.get(this.resolveNodeId(nodeId));
  }

  /** True when this node should be referenced instead of inlined */
  shouldReference(nodeId: string): boolean {
    const canonical = this.resolveNodeId(nodeId);
    if (canonical === this.generatingNodeId || nodeId === this.generatingNodeId) return false;
    return this.extracted.has(canonical);
  }

  getComponentName(nodeId: string): string {
    return this.extracted.get(this.resolveNodeId(nodeId))?.name ?? 'UnknownComponent';
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

function buildParentMap(root: DesignNode): Map<string, DesignNode> {
  const parentMap = new Map<string, DesignNode>();
  walkAST(root, (node, parent) => {
    if (parent) parentMap.set(node.id, parent);
  });
  return parentMap;
}

function hasExtractableInstanceAncestor(
  nodeId: string,
  rootId: string,
  parentMap: Map<string, DesignNode>,
  isExtractable: (node: DesignNode) => boolean,
): boolean {
  let current = parentMap.get(nodeId);
  while (current && current.id !== rootId) {
    if ((current.type === 'instance' || current.type === 'component') && isExtractable(current)) {
      return true;
    }
    current = parentMap.get(current.id);
  }
  return false;
}

/** Collect import lines only for sub-components referenced when rendering this node */
export function getReferencedImports(
  node: DesignNode,
  registry: ComponentRegistry,
  plan: CompoundPlan,
  formatImport: (sub: ExtractedComponent) => string,
): string[] {
  const referenced = new Set<string>();

  function walk(current: DesignNode): void {
    for (const child of current.children) {
      if (registry.shouldReference(child.id)) {
        referenced.add(registry.resolveNodeId(child.id));
      } else {
        walk(child);
      }
    }
  }

  walk(node);

  return [...referenced]
    .map((id) => plan.components.find((c) => c.canonicalNodeId === id))
    .filter((c): c is ExtractedComponent => c !== undefined)
    .map(formatImport);
}

/** Build a compound decomposition plan — breaks UI into smaller reusable sub-components */
export function planCompoundComponents(root: DesignNode, document: DesignDocument): CompoundPlan {
  const componentRefs = new Map<string, DetectedComponentRef>(
    document.components.map((c) => [c.nodeId, c]),
  );
  const parentMap = buildParentMap(root);
  const candidates: CandidateNode[] = [];

  const isExtractable = (node: DesignNode): boolean =>
    shouldExtractNode(node, componentRefs.get(node.id));

  walkAST(root, (node, _parent, depth) => {
    if (node.id === root.id) return;
    if (hasExtractableInstanceAncestor(node.id, root.id, parentMap, isExtractable)) return;

    const ref = componentRefs.get(node.id);
    if (!shouldExtractNode(node, ref)) return;

    candidates.push({ node, depth, ref });
  });

  const components: ExtractedComponent[] = [];
  const aliases = new Map<string, string>();
  const byComponentId = new Map<string, ExtractedComponent>();
  const byCanonicalId = new Map<string, ExtractedComponent>();

  for (const { node, depth, ref } of candidates) {
    const componentId = node.metadata?.componentId as string | undefined;
    const duplicateOf = node.metadata?.duplicateOf as string | undefined;

    if (componentId && byComponentId.has(componentId)) {
      const canonical = byComponentId.get(componentId)!;
      aliases.set(node.id, canonical.canonicalNodeId);
      continue;
    }

    if (duplicateOf && (byCanonicalId.has(duplicateOf) || aliases.has(duplicateOf))) {
      const canonicalId = byCanonicalId.has(duplicateOf)
        ? duplicateOf
        : aliases.get(duplicateOf)!;
      const canonical = byCanonicalId.get(canonicalId);
      if (canonical) {
        aliases.set(node.id, canonical.canonicalNodeId);
        continue;
      }
    }

    const name = resolveComponentName(node, ref, componentId, byComponentId, document);
    const extracted: ExtractedComponent = {
      nodeId: node.id,
      canonicalNodeId: node.id,
      name,
      fileName: toKebabCase(name),
      node,
      semanticType: node.semanticType,
      depth,
      componentId,
    };

    components.push(extracted);
    byCanonicalId.set(extracted.canonicalNodeId, extracted);
    if (componentId) byComponentId.set(componentId, extracted);
  }

  // Link AI-detected structural duplicates to canonical components
  for (const { node } of candidates) {
    if (aliases.has(node.id)) continue;
    const duplicateOf = node.metadata?.duplicateOf as string | undefined;
    if (!duplicateOf) continue;

    const canonicalId = aliases.get(duplicateOf) ?? duplicateOf;
    if (!byCanonicalId.has(canonicalId) || node.id === canonicalId) continue;

    aliases.set(node.id, canonicalId);
    const removeIdx = components.findIndex((c) => c.nodeId === node.id);
    if (removeIdx >= 0) components.splice(removeIdx, 1);
  }

  components.sort((a, b) => b.depth - a.depth);

  const rootName = toPascalCase(root.name);
  return {
    root,
    rootName,
    rootFileName: toKebabCase(rootName),
    components,
    aliases: Object.fromEntries(aliases),
  };
}

function resolveComponentName(
  node: DesignNode,
  ref: DetectedComponentRef | undefined,
  componentId: string | undefined,
  byComponentId: Map<string, ExtractedComponent>,
  document: DesignDocument,
): string {
  if (componentId && byComponentId.has(componentId)) {
    return byComponentId.get(componentId)!.name;
  }

  const figmaComponentName = document.metadata.figmaComponents?.[componentId ?? '']?.name;
  if (figmaComponentName) return toPascalCase(figmaComponentName);

  return toPascalCase(ref?.name ?? node.name);
}

function shouldExtractNode(node: DesignNode, ref?: DetectedComponentRef): boolean {
  if (node.type === 'text' && !node.semanticType) return false;

  if (ref?.reusable) return true;
  if (node.type === 'component' || node.type === 'instance') return true;
  if (node.metadata?.isReusable === true) return true;
  if (node.semanticType && EXTRACTABLE_SEMANTICS.has(node.semanticType)) return true;

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

  const reExports = [
    `export { ${rootName} } from './${rootName}';`,
    ...subComponents.map((c) => `export { ${c.name} } from './${c.name}';`),
  ].join('\n');
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
