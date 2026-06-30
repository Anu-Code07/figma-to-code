import type { DesignNode } from '@design2code/design-ast';
import { TokenResolver, escapeDart } from '@design2code/generator-sdk';
import type { DesignTokenSet } from '@design2code/design-ast';

export class FlutterWidgetRenderer {
  private tokens: TokenResolver;

  constructor(tokenSet: DesignTokenSet) {
    this.tokens = new TokenResolver(tokenSet, { framework: 'flutter' });
  }

  renderWidget(node: DesignNode, className: string): string {
    const body = this.renderNode(node, 4);
    const props = this.buildProps(node);
    const fields = this.buildFields(node);

    return `import 'package:flutter/material.dart';
import 'package:design2code_app/core/theme/app_colors.dart';
import 'package:design2code_app/core/theme/app_spacing.dart';
import 'package:design2code_app/core/theme/app_radius.dart';
import 'package:design2code_app/core/theme/app_typography.dart';

/// Generated reusable widget
class ${className} extends StatelessWidget {
  const ${className}({
    super.key,
${props}
  });

${fields}

  @override
  Widget build(BuildContext context) {
    return ${body};
  }
}
`;
  }

  private buildProps(node: DesignNode): string {
    const lines: string[] = [];
    if (node.semanticType === 'button') {
      lines.push('    this.onPressed,');
      lines.push('    this.label,');
    }
    if (node.semanticType === 'text-field' || node.semanticType === 'search-bar') {
      lines.push('    this.controller,');
      lines.push('    this.hintText,');
      lines.push('    this.onChanged,');
    }
    lines.push('    this.testKey,');
    return lines.join('\n');
  }

  private buildFields(node: DesignNode): string {
    const lines: string[] = [];
    if (node.semanticType === 'button') {
      lines.push('  final VoidCallback? onPressed;');
      lines.push('  final String? label;');
    }
    if (node.semanticType === 'text-field' || node.semanticType === 'search-bar') {
      lines.push('  final TextEditingController? controller;');
      lines.push('  final String? hintText;');
      lines.push('  final ValueChanged<String>? onChanged;');
    }
    lines.push('  final Key? testKey;');
    return lines.join('\n');
  }

  renderNode(node: DesignNode, indent: number): string {
    const pad = '  '.repeat(indent);

    if (node.semanticType === 'button') {
      const label = node.text?.content ?? node.name;
      const a11y = node.accessibility?.label ?? label;
      return `Semantics(
${pad}  label: '${escapeDart(a11y)}',
${pad}  button: true,
${pad}  child: ElevatedButton(
${pad}    key: testKey,
${pad}    onPressed: onPressed,
${pad}    style: ElevatedButton.styleFrom(
${pad}      backgroundColor: ${this.tokens.color(node.style.backgroundColor?.hex, 'primary')},
${pad}      padding: const EdgeInsets.symmetric(
${pad}        horizontal: AppSpacing.lg,
${pad}        vertical: AppSpacing.md,
${pad}      ),
${pad}      shape: RoundedRectangleBorder(
${pad}        borderRadius: BorderRadius.circular(AppRadius.md),
${pad}      ),
${pad}    ),
${pad}    child: Text(
${pad}      label ?? '${escapeDart(label)}',
${pad}      style: AppTypography.labelLarge.copyWith(color: AppColors.onPrimary),
${pad}    ),
${pad}  ),
${pad})`;
    }

    if (node.semanticType === 'text-field' || node.semanticType === 'search-bar') {
      return `TextField(
${pad}  key: testKey,
${pad}  controller: controller,
${pad}  onChanged: onChanged,
${pad}  decoration: InputDecoration(
${pad}    hintText: hintText ?? '${escapeDart(node.name)}',
${pad}    contentPadding: const EdgeInsets.symmetric(
${pad}      horizontal: AppSpacing.md,
${pad}      vertical: AppSpacing.sm,
${pad}    ),
${pad}  ),
${pad})`;
    }

    if (node.semanticType === 'card') {
      const child =
        node.children.length > 0
          ? this.renderNode(node.children[0], indent + 2)
          : 'const SizedBox.shrink()';
      return `Card(
${pad}  key: testKey,
${pad}  elevation: 1,
${pad}  shape: RoundedRectangleBorder(
${pad}    borderRadius: BorderRadius.circular(AppRadius.lg),
${pad}  ),
${pad}  child: Padding(
${pad}    padding: const EdgeInsets.all(AppSpacing.md),
${pad}    child: ${child},
${pad}  ),
${pad})`;
    }

    if (node.type === 'text' && node.text) {
      const style = node.text.fontSize && node.text.fontSize > 20 ? 'titleLarge' : 'bodyMedium';
      return `Text(
${pad}  '${escapeDart(node.text.content)}',
${pad}  style: AppTypography.${style}.copyWith(
${pad}    color: ${this.tokens.color(node.text.color?.hex, 'onSurface')},
${pad}  ),
${pad})`;
    }

    if (node.layout.mode === 'horizontal') {
      const children = node.children.map((c) => this.renderNode(c, indent + 2)).join(`,\n${pad}    `);
      return `Row(
${pad}  mainAxisAlignment: MainAxisAlignment.${mapJustify(node.layout.justify)},
${pad}  crossAxisAlignment: CrossAxisAlignment.${mapAlign(node.layout.align)},
${pad}  children: [
${pad}    ${children}
${pad}  ],
${pad})`;
    }

    if (node.layout.mode === 'vertical') {
      const children = node.children.map((c) => this.renderNode(c, indent + 2)).join(`,\n${pad}    `);
      return `Column(
${pad}  crossAxisAlignment: CrossAxisAlignment.stretch,
${pad}  mainAxisAlignment: MainAxisAlignment.${mapJustify(node.layout.justify)},
${pad}  children: [
${pad}    ${children}
${pad}  ],
${pad})`;
    }

    if (node.children.length === 0) {
      const bg = node.style.backgroundColor?.hex;
      return `Container(
${pad}  key: testKey,
${pad}  width: ${node.layout.width?.kind === 'fixed' ? node.layout.width.value : 'null'},
${pad}  height: ${node.layout.height?.kind === 'fixed' ? node.layout.height.value : 'null'},
${pad}  decoration: BoxDecoration(
${bg ? `${pad}    color: ${this.tokens.color(bg)},\n` : ''}${pad}    borderRadius: BorderRadius.circular(AppRadius.md),
${pad}  ),
${pad})`;
    }

    const children = node.children.map((c) => this.renderNode(c, indent + 2)).join(`,\n${pad}    `);

    return `Padding(
${pad}  padding: const EdgeInsets.all(AppSpacing.md),
${pad}  child: Column(
${pad}    crossAxisAlignment: CrossAxisAlignment.stretch,
${pad}    children: [
${pad}      ${children}
${pad}    ],
${pad}  ),
${pad})`;
  }
}

function mapJustify(justify?: string): string {
  const map: Record<string, string> = {
    start: 'start',
    center: 'center',
    end: 'end',
    'space-between': 'spaceBetween',
    'space-around': 'spaceAround',
    stretch: 'spaceEvenly',
  };
  return map[justify ?? 'start'] ?? 'start';
}

function mapAlign(align?: string): string {
  const map: Record<string, string> = {
    start: 'start',
    center: 'center',
    end: 'end',
    stretch: 'stretch',
  };
  return map[align ?? 'start'] ?? 'start';
}
