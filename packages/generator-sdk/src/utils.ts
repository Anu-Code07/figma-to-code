import type { DesignNode } from '@design2code/design-ast';

export function nodeToTree(node: DesignNode, indent = 0): string {
  const prefix = '  '.repeat(indent);
  let result = `${prefix}${node.type}: ${node.name}`;
  if (node.text?.content) {
    result += ` ("${node.text.content.slice(0, 50)}")`;
  }
  result += '\n';
  for (const child of node.children) {
    result += nodeToTree(child, indent + 1);
  }
  return result;
}

export function getColor(node: DesignNode): string | undefined {
  return (
    node.style.backgroundColor?.token ??
    node.style.backgroundColor?.hex ??
    node.text?.color?.hex
  );
}

export function getDimension(node: DesignNode, axis: 'width' | 'height'): string {
  const dim = node.layout[axis];
  if (!dim) return 'auto';
  switch (dim.kind) {
    case 'fixed':
      return `${dim.value}`;
    case 'fill':
      return '100%';
    case 'hug':
      return 'auto';
    case 'percent':
      return `${dim.value}%`;
    case 'token':
      return dim.name;
    default:
      return 'auto';
  }
}
