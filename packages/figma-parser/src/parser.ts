import type { DesignDocument, DesignNode } from '@figma-to-code/design-ast';
import { DesignASTBuilder, createDesignNode } from '@figma-to-code/design-ast';
import { extractTokens } from '@figma-to-code/design-token-engine';
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

    if (figmaFile.components) {
      document.metadata.figmaComponents = Object.fromEntries(
        Object.entries(figmaFile.components).map(([id, meta]) => [
          id,
          { name: meta.name, description: meta.description },
        ]),
      );
    }

    return document;
  }

  private convertNode(figmaNode: FigmaNode, parentBbox?: { x: number; y: number }): DesignNode {
    const type = this.mapNodeType(figmaNode.type);
    const bbox = figmaNode.absoluteBoundingBox;
    const layoutMode = this.mapLayoutMode(figmaNode.layoutMode);
    const fills = this.extractFills(figmaNode.fills);

    const node = createDesignNode({
      id: figmaNode.id,
      type,
      name: figmaNode.name,
      layout: {
        mode: layoutMode,
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
        ...(layoutMode === 'absolute' || layoutMode === 'none'
          ? {
              position: 'absolute' as const,
              ...(bbox && parentBbox
                ? { left: bbox.x - parentBbox.x, top: bbox.y - parentBbox.y }
                : {}),
            }
          : {}),
      },
      style: {
        backgroundColor: fills.solid,
        gradient: fills.gradient,
        backgroundImageRef: fills.imageRef,
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
              color: fills.solid,
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
        .map((c) => this.convertNode(c, bbox ? { x: bbox.x, y: bbox.y } : parentBbox)),
    });

    if (fills.imageRef) {
      node.asset = {
        format: 'png',
        url: `figma://${fills.imageRef}`,
        alt: figmaNode.name,
      };
      if (type === 'vector') {
        node.type = 'image';
      }
    }

    if (figmaNode.type === 'INSTANCE' && figmaNode.componentId) {
      node.metadata = {
        ...node.metadata,
        componentId: figmaNode.componentId,
      };
    }

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

  private extractFills(fills?: FigmaFill[]): {
    solid?: { hex: string; rgba?: { r: number; g: number; b: number; a: number } };
    gradient?: import('@figma-to-code/design-ast').GradientValue;
    imageRef?: string;
  } {
    if (!fills?.length) return {};
    const visible = fills.filter((f) => f.visible !== false);
    const imageFill = visible.find((f) => f.type === 'IMAGE' && f.imageRef);
    const gradientFill = visible.find(
      (f) => f.type === 'GRADIENT_LINEAR' && f.gradientStops?.length,
    );
    const solidFill = visible.find((f) => f.type === 'SOLID' && f.color);

    return {
      solid: solidFill ? this.colorFromRgba(solidFill.color!) : undefined,
      imageRef: imageFill?.imageRef,
      gradient: gradientFill
        ? {
            type: 'linear',
            stops: gradientFill.gradientStops!.map((s) => ({
              offset: s.position,
              color: rgbaToHex(s.color.r, s.color.g, s.color.b),
            })),
            angle: this.gradientAngle(gradientFill.gradientHandlePositions),
          }
        : undefined,
    };
  }

  private gradientAngle(handles?: Array<{ x: number; y: number }>): number | undefined {
    if (!handles || handles.length < 2) return undefined;
    const [a, b] = handles;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
  }

  private colorFromRgba(color: { r: number; g: number; b: number; a: number }) {
    return {
      hex: rgbaToHex(color.r, color.g, color.b),
      rgba: {
        r: Math.round(color.r * 255),
        g: Math.round(color.g * 255),
        b: Math.round(color.b * 255),
        a: color.a,
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
