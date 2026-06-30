import type { DesignDocument, DesignNode } from '@design2code/design-ast';
import { DesignASTBuilder, createDesignNode } from '@design2code/design-ast';
import { extractTokens } from '@design2code/design-token-engine';
import type { FigmaFileResponse, FigmaNode, FigmaFill, FigmaEffect } from './types.js';

export interface ParseOptions {
  fileKey?: string;
  nodeIds?: string[];
  fileName?: string;
}

export class FigmaParser {
  parse(figmaFile: FigmaFileResponse, options: ParseOptions = {}): DesignDocument {
    const root = this.convertNode(figmaFile.document);
    const builder = new DesignASTBuilder()
      .setName(options.fileName ?? figmaFile.name)
      .setRoot(root)
      .setMetadata({
        figmaFileKey: options.fileKey,
        figmaVersion: figmaFile.version,
        source: 'figma',
      });

    const document = builder.build();
    document.tokens = extractTokens(document);
    return document;
  }

  private convertNode(figmaNode: FigmaNode): DesignNode {
    const type = this.mapNodeType(figmaNode.type);
    const bbox = figmaNode.absoluteBoundingBox;

    const node = createDesignNode({
      id: figmaNode.id,
      type,
      name: figmaNode.name,
      layout: {
        mode: this.mapLayoutMode(figmaNode.layoutMode),
        width: bbox ? { kind: 'fixed', value: bbox.width } : { kind: 'hug' },
        height: bbox ? { kind: 'fixed', value: bbox.height } : { kind: 'hug' },
        padding: {
          top: figmaNode.paddingTop ?? 0,
          right: figmaNode.paddingRight ?? 0,
          bottom: figmaNode.paddingBottom ?? 0,
          left: figmaNode.paddingLeft ?? 0,
        },
        gap: figmaNode.itemSpacing,
        align: this.mapAlignment(figmaNode.counterAxisAlignItems),
        justify: this.mapAlignment(figmaNode.primaryAxisAlignItems),
      },
      style: {
        backgroundColor: this.extractFillColor(figmaNode.fills),
        borderColor: this.extractStrokeColor(figmaNode.strokes),
        borderWidth: figmaNode.strokeWeight,
        borderRadius: figmaNode.cornerRadius
          ? {
              topLeft: figmaNode.cornerRadius,
              topRight: figmaNode.cornerRadius,
              bottomRight: figmaNode.cornerRadius,
              bottomLeft: figmaNode.cornerRadius,
            }
          : figmaNode.rectangleCornerRadii
            ? {
                topLeft: figmaNode.rectangleCornerRadii[0],
                topRight: figmaNode.rectangleCornerRadii[1],
                bottomRight: figmaNode.rectangleCornerRadii[2],
                bottomLeft: figmaNode.rectangleCornerRadii[3],
              }
            : undefined,
        opacity: figmaNode.opacity,
        shadow: this.extractShadow(figmaNode.effects),
      },
      text:
        figmaNode.type === 'TEXT' && figmaNode.characters
          ? {
              content: figmaNode.characters,
              fontFamily: figmaNode.style?.fontFamily,
              fontSize: figmaNode.style?.fontSize,
              fontWeight: figmaNode.style?.fontWeight,
              lineHeight: figmaNode.style?.lineHeightPx,
              letterSpacing: figmaNode.style?.letterSpacing,
              textAlign: this.mapTextAlign(figmaNode.style?.textAlignHorizontal),
              textDecoration:
                figmaNode.style?.textDecoration === 'UNDERLINE' ? 'underline' : 'none',
              color: this.extractFillColor(figmaNode.fills),
            }
          : undefined,
      constraints: figmaNode.constraints
        ? {
            horizontal: this.mapHorizontalConstraint(figmaNode.constraints.horizontal),
            vertical: this.mapVerticalConstraint(figmaNode.constraints.vertical),
          }
        : undefined,
      children: (figmaNode.children ?? [])
        .filter((c) => c.visible !== false)
        .map((c) => this.convertNode(c)),
    });

    return node;
  }

  private mapNodeType(type: string): DesignNode['type'] {
    const map: Record<string, DesignNode['type']> = {
      DOCUMENT: 'document',
      CANVAS: 'frame',
      FRAME: 'frame',
      GROUP: 'group',
      COMPONENT: 'component',
      COMPONENT_SET: 'component',
      INSTANCE: 'instance',
      TEXT: 'text',
      RECTANGLE: 'rectangle',
      ELLIPSE: 'ellipse',
      VECTOR: 'vector',
    };
    return map[type] ?? 'group';
  }

  private mapLayoutMode(mode?: string): DesignNode['layout']['mode'] {
    const map: Record<string, DesignNode['layout']['mode']> = {
      NONE: 'absolute',
      HORIZONTAL: 'horizontal',
      VERTICAL: 'vertical',
      GRID: 'grid',
    };
    return mode ? (map[mode] ?? 'none') : 'none';
  }

  private mapAlignment(value?: string): DesignNode['layout']['align'] {
    const map: Record<string, DesignNode['layout']['align']> = {
      MIN: 'start',
      CENTER: 'center',
      MAX: 'end',
      STRETCH: 'stretch',
      SPACE_BETWEEN: 'space-between',
    };
    return value ? (map[value] ?? 'start') : 'start';
  }

  private mapTextAlign(value?: string): 'left' | 'center' | 'right' | 'justify' {
    const map: Record<string, 'left' | 'center' | 'right' | 'justify'> = {
      LEFT: 'left',
      CENTER: 'center',
      RIGHT: 'right',
      JUSTIFIED: 'justify',
    };
    return value ? (map[value] ?? 'left') : 'left';
  }

  private mapHorizontalConstraint(value: string): 'left' | 'right' | 'center' | 'left-right' | 'scale' {
    const map: Record<string, 'left' | 'right' | 'center' | 'left-right' | 'scale'> = {
      LEFT: 'left',
      RIGHT: 'right',
      CENTER: 'center',
      LEFT_RIGHT: 'left-right',
      SCALE: 'scale',
    };
    return map[value] ?? 'left';
  }

  private mapVerticalConstraint(value: string): 'top' | 'bottom' | 'center' | 'top-bottom' | 'scale' {
    const map: Record<string, 'top' | 'bottom' | 'center' | 'top-bottom' | 'scale'> = {
      TOP: 'top',
      BOTTOM: 'bottom',
      CENTER: 'center',
      TOP_BOTTOM: 'top-bottom',
      SCALE: 'scale',
    };
    return map[value] ?? 'top';
  }

  private extractFillColor(fills?: FigmaFill[]) {
    const fill = fills?.find((f) => f.visible !== false && f.type === 'SOLID' && f.color);
    if (!fill?.color) return undefined;
    return {
      hex: rgbaToHex(fill.color.r, fill.color.g, fill.color.b),
      rgba: {
        r: Math.round(fill.color.r * 255),
        g: Math.round(fill.color.g * 255),
        b: Math.round(fill.color.b * 255),
        a: fill.color.a,
      },
    };
  }

  private extractStrokeColor(strokes?: { color?: { r: number; g: number; b: number } }[]) {
    const stroke = strokes?.[0];
    if (!stroke?.color) return undefined;
    return {
      hex: rgbaToHex(stroke.color.r, stroke.color.g, stroke.color.b),
    };
  }

  private extractShadow(effects?: FigmaEffect[]) {
    const shadow = effects?.find((e) => e.visible !== false && e.type === 'DROP_SHADOW');
    if (!shadow?.offset || !shadow.color) return undefined;
    return {
      offsetX: shadow.offset.x,
      offsetY: shadow.offset.y,
      blur: shadow.radius ?? 0,
      spread: shadow.spread ?? 0,
      color: {
        hex: rgbaToHex(shadow.color.r, shadow.color.g, shadow.color.b),
      },
    };
  }
}

function rgbaToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.round(n * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function parseFigmaFile(
  figmaFile: FigmaFileResponse,
  options?: ParseOptions,
): DesignDocument {
  return new FigmaParser().parse(figmaFile, options);
}
