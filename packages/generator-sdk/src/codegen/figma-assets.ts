import type { DesignNode } from '@figma-to-code/design-ast';
import { walkAST } from '@figma-to-code/design-ast';

export interface FigmaImageAsset {
  key: string;
  ref: string;
  url?: string;
}

export function collectFigmaImageAssets(root: DesignNode): FigmaImageAsset[] {
  const assets: FigmaImageAsset[] = [];
  const seen = new Set<string>();

  walkAST(root, (node) => {
    const ref = node.style.backgroundImageRef ?? node.asset?.url?.replace('figma://', '');
    if (!ref || seen.has(ref)) return;
    seen.add(ref);
    const key = `image_${ref.replace(/[^a-zA-Z0-9]/g, '_')}`;
    assets.push({ key, ref, url: node.asset?.url });
  });

  return assets;
}

export function renderFigmaAssetsDart(assets: FigmaImageAsset[]): string {
  if (assets.length === 0) return '';

  const lines = assets.map((a) => {
    const placeholder = a.url && !a.url.startsWith('figma://') ? a.url : `__FIGMA_IMAGE_${a.ref}__`;
    return `  static const String ${a.key} = '${placeholder.replace(/'/g, "\\'")}';`;
  });

  return `
/// Figma image asset URLs — replace placeholders after export from Figma
abstract final class FigmaAssets {
  FigmaAssets._();
${lines.join('\n')}
}
`;
}
