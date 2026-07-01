import type { DesignNode } from '@design2code/design-ast';
import { FlutterFidelityEmitter } from '@design2code/generator-sdk';
import type { DesignTokenSet } from '@design2code/design-ast';

export class FlutterWidgetRenderer {
  private emitter: FlutterFidelityEmitter;

  constructor(tokenSet: DesignTokenSet) {
    this.emitter = new FlutterFidelityEmitter(tokenSet);
  }

  renderWidget(node: DesignNode, className: string): string {
    const body = this.emitter.renderNode(node, 4);
    const props = this.buildProps(node);
    const fields = this.buildFields(node);

    return `import 'package:flutter/material.dart';
import 'package:design2code_app/core/theme/app_colors.dart';
import 'package:design2code_app/core/theme/app_spacing.dart';
import 'package:design2code_app/core/theme/app_radius.dart';
import 'package:design2code_app/core/theme/app_typography.dart';

/// Pixel-perfect widget generated from Figma design
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
