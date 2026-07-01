import type { GenerationResult, GeneratedFile } from '@design2code/design-ast';
import { BaseGenerator, type GeneratorContext } from '@design2code/generator-sdk';
import {
  generateCompoundFiles,
  flutterCompoundHooks,
  type CompoundEmitter,
} from '@design2code/generator-sdk';
import type { FlutterFidelityEmitter } from '@design2code/generator-sdk';
import { generateFlutterThemeFiles } from '@design2code/design-token-engine';
import { FlutterWidgetRenderer } from './widget-renderer.js';
import { generateCoreLayer, generateFeatureModule } from './feature-scaffold.js';
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

    // ── Core theme layer ──────────────────────────────────────
    for (const themeFile of generateFlutterThemeFiles(context.document.tokens)) {
      files.push(this.createFile(themeFile.path, themeFile.content, 'dart', 'token'));
    }

    // ── Core architecture layer (feature/screen/project scope) ─
    if (
      context.options.scope === 'feature' ||
      context.options.scope === 'screen' ||
      context.options.scope === 'project'
    ) {
      files.push(...generateCoreLayer());
    }

    // ── Shared component widgets (component scope) — compound pattern ─
    if (context.options.scope === 'component') {
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

        if (context.options.includeTests) {
          const name = toPascalCase(node.name);
          const snake = toSnakeCase(name);
          const importPath =
            plan.components.length > 0
              ? `package:design2code_app/shared/widgets/${snake}/${snake}.dart`
              : `package:design2code_app/shared/widgets/${snake}.dart`;
          files.push(this.generateWidgetTest(name, importPath));
        }
      }
    }

    // ── Screen scope — one Clean Architecture feature per screen ─
    if (context.options.scope === 'screen') {
      for (const screen of context.document.screens) {
        const screenContext: GeneratorContext = {
          ...context,
          document: { ...context.document, name: screen.name },
        };
        files.push(
          ...generateFeatureModule(screenContext, (path, content, kind) =>
            this.createFile(path, content, 'dart', kind),
          ),
        );
      }
      if (context.document.screens.length === 0 && nodes.length > 0) {
        files.push(
          ...generateFeatureModule(context, (path, content, kind) =>
            this.createFile(path, content, 'dart', kind),
          ),
        );
      }
    }

    // ── Feature module (Clean Architecture + BLoC) ────────────
    if (context.options.scope === 'feature') {
      files.push(
        ...generateFeatureModule(context, (path, content, kind) =>
          this.createFile(path, content, 'dart', kind),
        ),
      );
    }

    // ── Full project scaffold ─────────────────────────────────
    if (context.options.scope === 'project') {
      files.push(
        ...generateProjectScaffold(context, (path, content, kind) =>
          this.createFile(path, content, 'dart', kind),
        ),
      );

      // Generate a feature module per detected screen
      for (const screen of context.document.screens) {
        const screenContext: GeneratorContext = {
          ...context,
          document: { ...context.document, name: screen.name },
        };
        files.push(
          ...generateFeatureModule(screenContext, (path, content, kind) =>
            this.createFile(path, content, 'dart', kind),
          ),
        );
      }

      if (context.document.screens.length === 0) {
        files.push(
          ...generateFeatureModule(context, (path, content, kind) =>
            this.createFile(path, content, 'dart', kind),
          ),
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
