import type { GenerationResult, GeneratedFile, DesignNode } from '@design2code/design-ast';
import { BaseGenerator, type GeneratorContext } from '@design2code/generator-sdk';
import {
  generateCompoundFiles,
  flutterCompoundHooks,
  type CompoundEmitter,
  type CompoundPlan,
} from '@design2code/generator-sdk';
import type { FlutterFidelityEmitter } from '@design2code/generator-sdk';
import { generateFlutterThemeFiles } from '@design2code/design-token-engine';
import { FlutterWidgetRenderer } from './widget-renderer.js';
import {
  generateCoreLayer,
  generateFeatureModule,
  type FeatureDesignContent,
} from './feature-scaffold.js';
import { generateProjectScaffold } from './project-scaffold.js';
import { toPascalCase, toSnakeCase } from './naming.js';

export class FlutterGenerator extends BaseGenerator {
  readonly name = 'flutter';
  readonly framework = 'flutter';

  async generate(context: GeneratorContext): Promise<GenerationResult> {
    const files: GeneratedFile[] = [];
    const warnings: string[] = [];
    const nodes = this.filterNodesByScope(context);
    const renderer = new FlutterWidgetRenderer(context.document.tokens);

    for (const themeFile of generateFlutterThemeFiles(context.document.tokens)) {
      files.push(this.createFile(themeFile.path, themeFile.content, 'dart', 'token'));
    }

    if (
      context.options.scope === 'feature' ||
      context.options.scope === 'screen' ||
      context.options.scope === 'project'
    ) {
      files.push(...generateCoreLayer());
    }

    if (context.options.scope === 'component') {
      files.push(...this.generateCompoundWidgets(renderer, nodes, context, true));
    }

    if (context.options.scope === 'screen') {
      for (const screen of context.document.screens) {
        const screenNode = this.findNode(context.document.root, screen.nodeId);
        if (!screenNode) continue;
        const screenContext: GeneratorContext = {
          ...context,
          document: { ...context.document, name: screen.name, root: screenNode },
        };
        const { compoundFiles, designContent } = this.generateFeatureCompound(
          renderer,
          screenNode,
          screenContext,
        );
        files.push(...compoundFiles);
        files.push(
          ...generateFeatureModule(screenContext, (path, content, kind) =>
            this.createFile(path, content, 'dart', kind),
          designContent),
        );
      }
      if (context.document.screens.length === 0 && nodes.length > 0) {
        const { compoundFiles, designContent } = this.generateFeatureCompound(
          renderer,
          context.document.root,
          context,
        );
        files.push(...compoundFiles);
        files.push(
          ...generateFeatureModule(context, (path, content, kind) =>
            this.createFile(path, content, 'dart', kind),
          designContent),
        );
      }
    }

    if (context.options.scope === 'feature') {
      const { compoundFiles, designContent } = this.generateFeatureCompound(
        renderer,
        context.document.root,
        context,
      );
      files.push(...compoundFiles);
      files.push(
        ...generateFeatureModule(context, (path, content, kind) =>
          this.createFile(path, content, 'dart', kind),
        designContent),
      );
    }

    if (context.options.scope === 'project') {
      files.push(
        ...generateProjectScaffold(context, (path, content, kind) =>
          this.createFile(path, content, 'dart', kind),
        ),
      );

      for (const screen of context.document.screens) {
        const screenNode = this.findNode(context.document.root, screen.nodeId);
        if (!screenNode) continue;
        const screenContext: GeneratorContext = {
          ...context,
          document: { ...context.document, name: screen.name, root: screenNode },
        };
        const { compoundFiles, designContent } = this.generateFeatureCompound(
          renderer,
          screenNode,
          screenContext,
        );
        files.push(...compoundFiles);
        files.push(
          ...generateFeatureModule(screenContext, (path, content, kind) =>
            this.createFile(path, content, 'dart', kind),
          designContent),
        );
      }

      if (context.document.screens.length === 0) {
        const { compoundFiles, designContent } = this.generateFeatureCompound(
          renderer,
          context.document.root,
          context,
        );
        files.push(...compoundFiles);
        files.push(
          ...generateFeatureModule(context, (path, content, kind) =>
            this.createFile(path, content, 'dart', kind),
          designContent),
        );
      }
    }

    return {
      files,
      warnings,
      metadata: {
        framework: 'flutter',
        architecture: 'clean-architecture',
        stateManagement: 'bloc',
        nodeCount: nodes.length,
      },
    };
  }

  private generateFeatureCompound(
    renderer: FlutterWidgetRenderer,
    root: DesignNode,
    context: GeneratorContext,
  ): { compoundFiles: GeneratedFile[]; designContent: FeatureDesignContent } {
    const featureSnake = toSnakeCase(context.document.name);
    const hooks = flutterCompoundHooks(
      (node, name, emitter, registry, imports) =>
        renderer.renderWidget(node, name, emitter as FlutterFidelityEmitter, registry, imports),
      () => renderer.createEmitter() as CompoundEmitter,
      {
        baseDir: (rootName) =>
          `lib/features/${featureSnake}/presentation/widgets/${toSnakeCase(rootName)}`,
        flatDir: (plan) =>
          `lib/features/${featureSnake}/presentation/widgets/${toSnakeCase(plan.rootName)}.dart`,
      },
    );

    const { files: compoundFiles, plan } = generateCompoundFiles(
      root,
      context,
      (path, content, language, kind) => this.createFile(path, content, language, kind),
      hooks,
    );

    const designContent = this.buildDesignContent(plan);
    return { compoundFiles, designContent };
  }

  private generateCompoundWidgets(
    renderer: FlutterWidgetRenderer,
    nodes: DesignNode[],
    context: GeneratorContext,
    includeTests: boolean,
  ): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const hooks = flutterCompoundHooks(
      (node, name, emitter, registry, imports) =>
        renderer.renderWidget(node, name, emitter as FlutterFidelityEmitter, registry, imports),
      () => renderer.createEmitter() as CompoundEmitter,
    );

    for (const node of nodes) {
      const { files: compoundFiles, plan } = generateCompoundFiles(
        node,
        context,
        (path, content, language, kind) => this.createFile(path, content, language, kind),
        hooks,
      );
      files.push(...compoundFiles);

      if (includeTests && context.options.includeTests) {
        const name = toPascalCase(node.name);
        const snake = toSnakeCase(name);
        const importPath =
          plan.components.length > 0
            ? `package:design2code_app/shared/widgets/${snake}/${snake}.dart`
            : `package:design2code_app/shared/widgets/${snake}.dart`;
        files.push(this.generateWidgetTest(name, importPath));
      }
    }

    return files;
  }

  private buildDesignContent(plan: CompoundPlan): FeatureDesignContent {
    const rootSnake = toSnakeCase(plan.rootName);
    const widgetImportPath =
      plan.components.length > 0 ? `${rootSnake}/${rootSnake}` : rootSnake;
    return {
      widgetClassName: plan.rootName,
      widgetImportPath,
    };
  }

  private findNode(root: DesignNode, id: string): DesignNode | null {
    if (root.id === id) return root;
    for (const child of root.children) {
      const found = this.findNode(child, id);
      if (found) return found;
    }
    return null;
  }

  private generateWidgetTest(name: string, importPath: string): GeneratedFile {
    const snake = importPath.split('/').pop()!.replace('.dart', '');
    return this.createFile(
      `test/widgets/${snake}_test.dart`,
      `import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import '${importPath}';

void main() {
  group('${name}', () {
    testWidgets('renders without error', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: ${name}()),
      );
      expect(find.byType(${name}), findsOneWidget);
    });
  });
}
`,
      'dart',
      'test',
    );
  }
}
