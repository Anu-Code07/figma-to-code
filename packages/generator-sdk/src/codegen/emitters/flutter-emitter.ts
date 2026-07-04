import type { DesignNode } from '@figma-to-code/design-ast';
import type { FigmaComputedStyle } from '../figma-fidelity.js';
import { FigmaFidelityEngine } from '../figma-fidelity.js';
import { TokenResolver } from '../tokens.js';
import { escapeDart } from '../escape.js';
import type { DesignTokenSet } from '@figma-to-code/design-ast';
import type { ComponentRegistry } from '../compound-plan.js';

/** Emits pixel-perfect Flutter widget code from Figma AST nodes */
export class FlutterFidelityEmitter {
  private fidelity = new FigmaFidelityEngine();
  private tokens: TokenResolver;
  private registry?: ComponentRegistry;

  constructor(tokenSet: DesignTokenSet) {
    this.tokens = new TokenResolver(tokenSet, { framework: 'flutter' });
  }

  setRegistry(registry: ComponentRegistry | undefined): void {
    this.registry = registry;
  }

  renderNode(node: DesignNode, indent: number, registry?: ComponentRegistry): string {
    const activeRegistry = registry ?? this.registry;
    if (activeRegistry?.shouldReference(node.id)) {
      const pad = '  '.repeat(indent);
      const name = activeRegistry.getComponentName(node.id);
      return `${pad}const ${name}()`;
    }

    const pad = '  '.repeat(indent);
    const s = this.fidelity.compute(node);

    if (node.semanticType === 'button') {
      return this.emitButton(node, s, pad, activeRegistry);
    }
    if (node.semanticType === 'text-field' || node.semanticType === 'search-bar') {
      return this.emitTextField(node, s, pad);
    }
    if (node.semanticType === 'card') {
      return this.emitCard(node, s, pad, activeRegistry);
    }
    if (node.type === 'text' && node.text) {
      return this.emitText(node, s, pad);
    }
    if (node.layout.mode === 'horizontal' || node.layout.mode === 'vertical') {
      return this.emitFlex(node, s, pad, activeRegistry);
    }
    if (node.children.length === 0) {
      return this.emitContainer(node, s, pad);
    }
    return this.emitContainerWithChildren(node, s, pad, activeRegistry);
  }

  private renderChild(node: DesignNode, indent: number, registry?: ComponentRegistry): string {
    return this.renderNode(node, indent, registry);
  }

  private emitButton(node: DesignNode, s: FigmaComputedStyle, pad: string, _registry?: ComponentRegistry): string {
    const label = node.text?.content ?? node.name;
    const bg = s.backgroundColor ? this.tokens.color(s.backgroundColor) : 'AppColors.primary';
    const radius = s.borderRadius ? this.borderRadiusExpr(s.borderRadius) : 'AppRadius.md';
    const padH = s.padding?.left ?? 24;
    const padV = s.padding?.top ?? 12;

    return `Semantics(
${pad}  button: true,
${pad}  label: label ?? '${escapeDart(label)}',
${pad}  child: Material(
${pad}    elevation: ${s.shadow ? 2 : 0},
${pad}    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(${radius})),
${pad}    color: ${bg},
${pad}    child: InkWell(
${pad}      onTap: onPressed,
${pad}      borderRadius: BorderRadius.circular(${radius}),
${pad}      child: Padding(
${pad}        padding: const EdgeInsets.symmetric(horizontal: ${padH}, vertical: ${padV}),
${pad}        child: Text(
${pad}          label ?? '${escapeDart(label)}',
${pad}          style: ${this.textStyleExpr(s)},
${pad}          textAlign: TextAlign.center,
${pad}        ),
${pad}      ),
${pad}    ),
${pad}  ),
${pad})`;
  }

  private emitTextField(node: DesignNode, s: FigmaComputedStyle, pad: string): string {
    const radius = s.borderRadius ? this.borderRadiusExpr(s.borderRadius) : 'AppRadius.md';
    return `TextField(
${pad}  key: testKey,
${pad}  controller: controller,
${pad}  onChanged: onChanged,
${pad}  style: ${this.textStyleExpr(s)},
${pad}  decoration: InputDecoration(
${pad}    hintText: hintText ?? '${escapeDart(node.name)}',
${pad}    filled: true,
${pad}    fillColor: ${s.backgroundColor ? this.tokens.color(s.backgroundColor) : 'AppColors.surface'},
${pad}    contentPadding: ${this.edgeInsetsExpr(s.padding)},
${pad}    border: OutlineInputBorder(borderRadius: BorderRadius.circular(${radius})),
${pad}    enabledBorder: OutlineInputBorder(
${pad}      borderRadius: BorderRadius.circular(${radius}),
${pad}      borderSide: BorderSide(color: ${s.borderColor ? this.tokens.color(s.borderColor) : 'AppColors.surface'}),
${pad}    ),
${pad}  ),
${pad})`;
  }

  private emitCard(node: DesignNode, s: FigmaComputedStyle, pad: string, registry?: ComponentRegistry): string {
    const child =
      node.children.length > 0
        ? this.renderChild(node.children[0], indentLevel(pad) + 2, registry)
        : 'const SizedBox.shrink()';
    const radius = s.borderRadius ? this.borderRadiusExpr(s.borderRadius) : 'AppRadius.lg';

    return `Container(
${pad}  key: testKey,
${pad}  decoration: BoxDecoration(
${pad}    color: ${s.backgroundColor ? this.tokens.color(s.backgroundColor) : 'AppColors.surface'},
${pad}    borderRadius: BorderRadius.circular(${radius}),
${this.shadowExpr(s, pad + '    ')}${pad}  ),
${pad}  child: Padding(
${pad}    padding: ${this.edgeInsetsExpr(s.padding)},
${pad}    child: ${child},
${pad}  ),
${pad})`;
  }

  private emitText(node: DesignNode, s: FigmaComputedStyle, pad: string): string {
    const align = s.textAlign ? `TextAlign.${s.textAlign}` : 'TextAlign.start';
    return `Text(
${pad}  '${escapeDart(node.text!.content)}',
${pad}  style: ${this.textStyleExpr(s)},
${pad}  textAlign: ${align},
${pad})`;
  }

  private emitFlex(node: DesignNode, s: FigmaComputedStyle, pad: string, registry?: ComponentRegistry): string {
    const isRow = s.flexDirection === 'row';
    const widget = isRow ? 'Row' : 'Column';
    const mainAxis = isRow ? 'MainAxisAlignment' : 'MainAxisAlignment';
    const crossAxis = isRow ? 'CrossAxisAlignment' : 'CrossAxisAlignment';
    const children = node.children
      .map((c) => this.renderChild(c, indentLevel(pad) + 2, registry))
      .join(`,\n${pad}    `);
    const gap = s.gap ?? 0;

    return `${widget}(
${pad}  ${mainAxis}: ${this.flutterMainAxis(s.justifyContent)},
${pad}  ${crossAxis}: ${this.flutterCrossAxis(s.alignItems)},
${gap > 0 ? `${pad}  spacing: ${gap},\n` : ''}${pad}  children: [
${pad}    ${children}
${pad}  ],
${pad})`;
  }

  private emitContainer(_node: DesignNode, s: FigmaComputedStyle, pad: string): string {
    return `Container(
${pad}  key: testKey,
${this.sizeExpr(s, pad)}${pad}  decoration: ${this.boxDecorationExpr(s)},
${pad})`;
  }

  private emitContainerWithChildren(
    node: DesignNode,
    s: FigmaComputedStyle,
    pad: string,
    registry?: ComponentRegistry,
  ): string {
    const children = node.children
      .map((c) => this.renderChild(c, indentLevel(pad) + 2, registry))
      .join(`,\n${pad}      `);
    const gap = s.gap ?? 0;
    const direction = s.flexDirection === 'row' ? 'Axis.horizontal' : 'Axis.vertical';

    return `Container(
${pad}  key: testKey,
${this.sizeExpr(s, pad)}${pad}  padding: ${this.edgeInsetsExpr(s.padding)},
${pad}  decoration: ${this.boxDecorationExpr(s)},
${pad}  child: Flex(
${pad}    direction: ${direction},
${gap > 0 ? `${pad}    spacing: ${gap},\n` : ''}${pad}    crossAxisAlignment: ${this.flutterCrossAxis(s.alignItems)},
${pad}    mainAxisAlignment: ${this.flutterMainAxis(s.justifyContent)},
${pad}    children: [
${pad}      ${children}
${pad}    ],
${pad}  ),
${pad})`;
  }

  private boxDecorationExpr(s: FigmaComputedStyle): string {
    const parts: string[] = ['BoxDecoration('];
    if (s.backgroundColor) parts.push(`color: ${this.tokens.color(s.backgroundColor)},`);
    if (s.borderRadius) parts.push(`borderRadius: BorderRadius.circular(${this.borderRadiusExpr(s.borderRadius)}),`);
    if (s.borderWidth && s.borderColor) {
      parts.push(`border: Border.all(color: ${this.tokens.color(s.borderColor)}, width: ${s.borderWidth}),`);
    }
    if (s.shadow) {
      parts.push(`boxShadow: [BoxShadow(${this.flutterShadowProps(s.shadow)})],`);
    }
    parts.push(')');
    return parts.join(' ');
  }

  private textStyleExpr(s: FigmaComputedStyle): string {
    const parts: string[] = ['TextStyle('];
    if (s.fontSize) parts.push(`fontSize: ${s.fontSize},`);
    if (s.fontWeight) parts.push(`fontWeight: FontWeight.w${s.fontWeight},`);
    if (s.fontFamily) parts.push(`fontFamily: '${s.fontFamily}',`);
    if (s.lineHeight && s.fontSize) parts.push(`height: ${(s.lineHeight / s.fontSize).toFixed(2)},`);
    if (s.letterSpacing) parts.push(`letterSpacing: ${s.letterSpacing},`);
    if (s.color) parts.push(`color: ${this.tokens.color(s.color)},`);
    if (parts.length === 1) return 'AppTypography.bodyMedium';
    parts.push(')');
    return parts.join(' ');
  }

  private edgeInsetsExpr(padding?: { top: number; right: number; bottom: number; left: number }): string {
    if (!padding) return 'EdgeInsets.zero';
    if (padding.top === padding.right && padding.right === padding.bottom && padding.bottom === padding.left) {
      return `const EdgeInsets.all(${padding.top})`;
    }
    return `const EdgeInsets.fromLTRB(${padding.left}, ${padding.top}, ${padding.right}, ${padding.bottom})`;
  }

  private borderRadiusExpr(r: { topLeft: number }): string {
    return r.topLeft.toString();
  }

  private sizeExpr(s: FigmaComputedStyle, pad: string): string {
    const lines: string[] = [];
    if (typeof s.width === 'number') lines.push(`${pad}  width: ${s.width},`);
    if (typeof s.height === 'number') lines.push(`${pad}  height: ${s.height},`);
    return lines.join('\n');
  }

  private shadowExpr(s: FigmaComputedStyle, pad: string): string {
    if (!s.shadow) return '';
    return `${pad}boxShadow: [BoxShadow(${this.flutterShadowProps(s.shadow)})],\n`;
  }

  private flutterShadowProps(shadow: NonNullable<FigmaComputedStyle['shadow']>): string {
    const c = shadow.color.hex?.replace('#', '') ?? '000000';
    return `color: Color(0x${Math.round((shadow.color.rgba?.a ?? 0.25) * 255).toString(16).padStart(2, '0')}${c}), offset: Offset(${shadow.offsetX}, ${shadow.offsetY}), blurRadius: ${shadow.blur}`;
  }

  private flutterMainAxis(v?: string): string {
    const map: Record<string, string> = {
      'flex-start': 'start',
      center: 'center',
      'flex-end': 'end',
      'space-between': 'spaceBetween',
      'space-around': 'spaceAround',
      stretch: 'spaceEvenly',
    };
    return `MainAxisAlignment.${map[v ?? 'flex-start'] ?? 'start'}`;
  }

  private flutterCrossAxis(v?: string): string {
    const map: Record<string, string> = {
      'flex-start': 'start',
      center: 'center',
      'flex-end': 'end',
      stretch: 'stretch',
    };
    return `CrossAxisAlignment.${map[v ?? 'flex-start'] ?? 'start'}`;
  }
}

function indentLevel(pad: string): number {
  return pad.length / 2;
}
