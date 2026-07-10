import type { DesignNode } from '@figma-to-code/design-ast';
import { FlutterFidelityEmitter, type ComponentRegistry } from '@figma-to-code/generator-sdk';
import { collectFigmaImageAssets, renderFigmaAssetsDart } from '@figma-to-code/generator-sdk';
import type { DesignTokenSet } from '@figma-to-code/design-ast';

export class FlutterWidgetRenderer {
  private emitter: FlutterFidelityEmitter;
  private readonly tokenSet: DesignTokenSet;

  constructor(tokenSet: DesignTokenSet) {
    this.tokenSet = tokenSet;
    this.emitter = new FlutterFidelityEmitter(tokenSet);
  }

  createEmitter(): FlutterFidelityEmitter {
    return new FlutterFidelityEmitter(this.tokenSet);
  }

  renderWidget(
    node: DesignNode,
    className: string,
    emitter: FlutterFidelityEmitter,
    registry?: ComponentRegistry,
    imports: string[] = [],
  ): string {
    emitter.setRegistry(registry);
    const body = emitter.renderNode(node, 4, registry);
    const props = this.buildProps(node);
    const fields = this.buildFields(node);
    const importBlock = imports.length > 0 ? `${imports.join('\n')}\n` : '';
    const figmaAssets = renderFigmaAssetsDart(collectFigmaImageAssets(node));

    return `import 'package:flutter/material.dart';
import 'package:design2code_app/core/theme/app_colors.dart';
import 'package:design2code_app/core/theme/app_spacing.dart';
import 'package:design2code_app/core/theme/app_radius.dart';
import 'package:design2code_app/core/theme/app_typography.dart';
${importBlock}${figmaAssets}
/// Compound widget — composes reusable sub-components from Figma design
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

  renderNode(node: DesignNode, indent: number): string {
    return this.emitter.renderNode(node, indent);
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
}
