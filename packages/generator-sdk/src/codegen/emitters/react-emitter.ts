import type { DesignNode } from '@design2code/design-ast';
import type { FigmaComputedStyle } from '../figma-fidelity.js';
import {
  FigmaFidelityEngine,
  formatBorderRadius,
  formatShadow,
} from '../figma-fidelity.js';
import { escapeHtml, escapeTs } from '../escape.js';

/** Emits pixel-perfect React/Next.js JSX with inline styles from Figma AST */
export class ReactFidelityEmitter {
  private fidelity = new FigmaFidelityEngine();

  renderJSX(node: DesignNode, indent: number): string {
    const pad = '  '.repeat(indent);
    const s = this.fidelity.compute(node);
    const style = this.styleObject(s);

    if (node.semanticType === 'button') {
      const label = escapeHtml(node.text?.content ?? node.name);
      return `${pad}<button type="button" style={${style}} className="transition-opacity hover:opacity-90 active:scale-[0.98]">\n${pad}  ${label}\n${pad}</button>`;
    }

    if (node.type === 'text' && node.text) {
      const Tag = this.textTag(s);
      const textStyle = this.styleObject({ ...s, backgroundColor: undefined });
      return `${pad}<${Tag} style={${textStyle}}>${escapeHtml(node.text.content)}</${Tag}>`;
    }

    if (node.layout.mode === 'horizontal' || node.layout.mode === 'vertical') {
      const children = node.children.map((c) => this.renderJSX(c, indent + 1)).join('\n');
      return `${pad}<div style={${style}}>\n${children}\n${pad}</div>`;
    }

    if (node.children.length === 0) {
      return `${pad}<div style={${style}} />`;
    }

    const children = node.children.map((c) => this.renderJSX(c, indent + 1)).join('\n');
    return `${pad}<div style={${style}}>\n${children}\n${pad}</div>`;
  }

  styleObject(s: FigmaComputedStyle): string {
    const obj: Record<string, string | number> = {
      display: 'flex',
      boxSizing: 'border-box',
    };

    if (s.flexDirection) {
      obj.flexDirection = s.flexDirection;
      obj.alignItems = s.alignItems ?? 'flex-start';
      obj.justifyContent = s.justifyContent ?? 'flex-start';
    }
    if (s.gap !== undefined) obj.gap = s.gap;
    if (s.flexWrap) obj.flexWrap = 'wrap';

    if (typeof s.width === 'number') obj.width = s.width;
    else if (s.width === '100%') obj.width = '100%';
    if (typeof s.height === 'number') obj.height = s.height;
    else if (s.height === '100%') obj.height = '100%';

    if (s.padding) {
      const p = s.padding;
      if (p.top === p.right && p.right === p.bottom && p.bottom === p.left) {
        obj.padding = p.top;
      } else {
        obj.padding = `${p.top}px ${p.right}px ${p.bottom}px ${p.left}px`;
      }
    }

    if (s.backgroundColor) obj.backgroundColor = s.backgroundColor;
    if (s.borderColor && s.borderWidth) {
      obj.border = `${s.borderWidth}px solid ${s.borderColor}`;
    }
    if (s.borderRadius) {
      const r = s.borderRadius;
      if (r.topLeft === r.topRight && r.topRight === r.bottomRight && r.bottomRight === r.bottomLeft) {
        obj.borderRadius = r.topLeft;
      } else {
        obj.borderRadius = formatBorderRadius(r);
      }
    }
    if (s.shadow) obj.boxShadow = formatShadow(s.shadow);
    if (s.opacity !== undefined) obj.opacity = s.opacity;

    if (s.color) obj.color = s.color;
    if (s.fontSize) obj.fontSize = s.fontSize;
    if (s.fontWeight) obj.fontWeight = s.fontWeight;
    if (s.fontFamily) obj.fontFamily = `'${s.fontFamily}', sans-serif`;
    if (s.lineHeight) obj.lineHeight = `${s.lineHeight}px`;
    if (s.letterSpacing) obj.letterSpacing = s.letterSpacing;
    if (s.textAlign) obj.textAlign = s.textAlign;

    const entries = Object.entries(obj)
      .map(([k, v]) => {
        const key = k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
        return typeof v === 'number' ? `'${key}': ${v}` : `'${key}': '${escapeTs(String(v))}'`;
      })
      .join(', ');

    return `{ ${entries} }`;
  }

  private textTag(s: FigmaComputedStyle): string {
    if (s.fontSize && s.fontSize >= 28) return 'h1';
    if (s.fontSize && s.fontSize >= 22) return 'h2';
    if (s.fontSize && s.fontSize >= 18) return 'h3';
    return 'p';
  }
}

type RNStyleValue = string | number | { width: number; height: number };

/** Emits pixel-perfect React Native JSX with StyleSheet from Figma AST */
export class ReactNativeFidelityEmitter {
  private fidelity = new FigmaFidelityEngine();
  private styleCounter = 0;
  readonly styleEntries = new Map<string, Record<string, RNStyleValue>>();

  renderJSX(node: DesignNode, indent: number): string {
    const pad = '  '.repeat(indent);
    const styleKey = this.registerStyle(node);

    if (node.semanticType === 'button') {
      const label = node.text?.content ?? node.name;
      const textKey = this.registerTextStyle(node);
      return `${pad}<Pressable style={styles.${styleKey}} accessibilityRole="button">
${pad}  <Text style={styles.${textKey}}>${escapeHtml(label)}</Text>
${pad}</Pressable>`;
    }

    if (node.type === 'text' && node.text) {
      const textKey = this.registerTextStyle(node);
      return `${pad}<Text style={styles.${textKey}}>${escapeHtml(node.text.content)}</Text>`;
    }

    if (node.layout.mode === 'horizontal' || node.layout.mode === 'vertical') {
      const children = node.children.map((c) => this.renderJSX(c, indent + 1)).join('\n');
      return `${pad}<View style={styles.${styleKey}}>\n${children}\n${pad}</View>`;
    }

    if (node.children.length === 0) {
      return `${pad}<View style={styles.${styleKey}} />`;
    }

    const children = node.children.map((c) => this.renderJSX(c, indent + 1)).join('\n');
    return `${pad}<View style={styles.${styleKey}}>\n${children}\n${pad}</View>`;
  }

  toStyleSheet(): string {
    const lines = [...this.styleEntries.entries()]
      .map(([key, style]) => {
        const props = Object.entries(style)
          .map(([k, v]) => {
            if (typeof v === 'object' && v !== null) {
              const inner = Object.entries(v)
                .map(([ik, iv]) => `${ik}: ${iv}`)
                .join(', ');
              return `    ${k}: { ${inner} },`;
            }
            return `    ${k}: ${typeof v === 'number' ? v : `'${v}'`},`;
          })
          .join('\n');
        return `  ${key}: {\n${props}\n  },`;
      })
      .join('\n');
    return `const styles = StyleSheet.create({\n${lines}\n});`;
  }

  private registerStyle(node: DesignNode): string {
    const key = `s${this.styleCounter++}`;
    const s = this.fidelity.compute(node);
    const style: Record<string, RNStyleValue> = {};

    if (s.flexDirection) {
      style.flexDirection = s.flexDirection;
      style.alignItems = s.alignItems ?? 'flex-start';
      style.justifyContent = s.justifyContent ?? 'flex-start';
    }
    if (s.gap !== undefined) style.gap = s.gap;
    if (typeof s.width === 'number') style.width = s.width;
    if (typeof s.height === 'number') style.height = s.height;
    if (s.padding) {
      const p = s.padding;
      if (p.top === p.right && p.right === p.bottom && p.bottom === p.left) {
        style.padding = p.top;
      } else {
        style.paddingTop = p.top;
        style.paddingRight = p.right;
        style.paddingBottom = p.bottom;
        style.paddingLeft = p.left;
      }
    }
    if (s.backgroundColor) style.backgroundColor = s.backgroundColor;
    if (s.borderColor && s.borderWidth) {
      style.borderColor = s.borderColor;
      style.borderWidth = s.borderWidth;
    }
    if (s.borderRadius) {
      const r = s.borderRadius;
      if (r.topLeft === r.topRight && r.topRight === r.bottomRight) {
        style.borderRadius = r.topLeft;
      } else {
        style.borderTopLeftRadius = r.topLeft;
        style.borderTopRightRadius = r.topRight;
        style.borderBottomRightRadius = r.bottomRight;
        style.borderBottomLeftRadius = r.bottomLeft;
      }
    }
    if (s.shadow) {
      style.shadowColor = s.shadow.color.hex ?? '#000';
      style.shadowOffset = { width: s.shadow.offsetX, height: s.shadow.offsetY };
      style.shadowOpacity = s.shadow.color.rgba?.a ?? 0.25;
      style.shadowRadius = s.shadow.blur;
      style.elevation = 4;
    }
    if (s.opacity !== undefined) style.opacity = s.opacity;

    this.styleEntries.set(key, style);
    return key;
  }

  private registerTextStyle(node: DesignNode): string {
    const key = `t${this.styleCounter++}`;
    const s = this.fidelity.compute(node);
    const style: Record<string, RNStyleValue> = {};
    if (s.color) style.color = s.color;
    if (s.fontSize) style.fontSize = s.fontSize;
    if (s.fontWeight) style.fontWeight = String(s.fontWeight);
    if (s.fontFamily) style.fontFamily = s.fontFamily;
    if (s.lineHeight) style.lineHeight = s.lineHeight;
    if (s.letterSpacing) style.letterSpacing = s.letterSpacing;
    if (s.textAlign) style.textAlign = s.textAlign;
    this.styleEntries.set(key, style);
    return key;
  }
}
