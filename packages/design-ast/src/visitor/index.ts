import type { DesignNode } from '../types/index.js';

export type DesignNodeVisitor = (node: DesignNode, parent: DesignNode | null, depth: number) => void;

export function walkAST(
  root: DesignNode,
  visitor: DesignNodeVisitor,
  parent: DesignNode | null = null,
  depth = 0,
): void {
  visitor(root, parent, depth);
  for (const child of root.children) {
    walkAST(child, visitor, root, depth + 1);
  }
}

export function findNodes(
  root: DesignNode,
  predicate: (node: DesignNode) => boolean,
): DesignNode[] {
  const results: DesignNode[] = [];
  walkAST(root, (node) => {
    if (predicate(node)) {
      results.push(node);
    }
  });
  return results;
}

export function flattenAST(root: DesignNode): DesignNode[] {
  const nodes: DesignNode[] = [];
  walkAST(root, (node) => nodes.push(node));
  return nodes;
}

export function getMaxDepth(root: DesignNode): number {
  let maxDepth = 0;
  walkAST(root, (_node, _parent, depth) => {
    maxDepth = Math.max(maxDepth, depth);
  });
  return maxDepth;
}
