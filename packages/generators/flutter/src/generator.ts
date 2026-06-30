import type { GenerationResult, DesignNode, GeneratedFile } from '@design2code/design-ast';
import { BaseGenerator, type GeneratorContext } from '@design2code/generator-sdk';
import { generateFlutterTheme } from '@design2code/design-token-engine';

export class FlutterGenerator extends BaseGenerator {
  readonly name = 'flutter';
  readonly framework = 'flutter';

  async generate(context: GeneratorContext): Promise<GenerationResult> {
    const files: GeneratedFile[] = [];
    const warnings: string[] = [];
    const nodes = this.filterNodesByScope(context);

    const tokenFile = generateFlutterTheme(context.document.tokens);
    files.push(
      this.createFile(tokenFile.path, tokenFile.content, 'dart', 'token'),
    );

    for (const node of nodes) {
      const name = this.toPascalCase(node.name);
      const widgetCode = this.generateWidget(node, name, context);
      const basePath = this.getOutputPath(node.name, 'component', context);
      files.push(
        this.createFile(`${basePath}/${this.toSnakeCase(name)}.dart`, widgetCode, 'dart', 'component'),
      );
    }

    if (context.options.scope === 'feature') {
      files.push(...this.generateFeatureStructure(context));
    }

    if (context.options.scope === 'project') {
      files.push(...this.generateProjectScaffold(context));
    }

    if (context.options.includeTests) {
      for (const node of nodes) {
        const name = this.toPascalCase(node.name);
        files.push(this.generateTest(name, context));
      }
    }

    return { files, warnings, metadata: { framework: 'flutter', nodeCount: nodes.length } };
  }

  private generateWidget(node: DesignNode, name: string, _context: GeneratorContext): string {
    const isStateless = !node.semanticType?.includes('form');
    const body = this.generateNodeBody(node, 4);

    if (isStateless) {
      return `import 'package:flutter/material.dart';

/// Auto-generated ${name} widget
class ${name} extends StatelessWidget {
  const ${name}({super.key});

  @override
  Widget build(BuildContext context) {
    return ${body};
  }
}
`;
    }

    return `import 'package:flutter/material.dart';

/// Auto-generated ${name} widget
class ${name} extends StatefulWidget {
  const ${name}({super.key});

  @override
  State<${name}> createState() => _${name}State();
}

class _${name}State extends State<${name}> {
  @override
  Widget build(BuildContext context) {
    return ${body};
  }
}
`;
  }

  private generateNodeBody(node: DesignNode, indent: number): string {
    const pad = '  '.repeat(indent);

    if (node.semanticType === 'button') {
      const label = node.text?.content ?? node.name;
      return `ElevatedButton(
${pad}  onPressed: () {},
${pad}  child: Text('${escapeDart(label)}'),
${pad})`;
    }

    if (node.type === 'text' && node.text) {
      return `Text(
${pad}  '${escapeDart(node.text.content)}',
${pad}  style: TextStyle(
${pad}    fontSize: ${node.text.fontSize ?? 14},
${pad}    fontWeight: FontWeight.w${node.text.fontWeight ?? 400},
${node.text.color ? `${pad}    color: Color(0xFF${node.text.color.hex.replace('#', '')}),` : ''}
${pad}  ),
${pad})`;
    }

    if (node.layout.mode === 'horizontal') {
      const children = node.children.map((c) => this.generateNodeBody(c, indent + 1)).join(`,\n${pad}  `);
      return `Row(
${pad}  mainAxisAlignment: MainAxisAlignment.${this.mapJustify(node.layout.justify)},
${pad}  crossAxisAlignment: CrossAxisAlignment.${this.mapAlign(node.layout.align)},
${pad}  children: [
${pad}    ${children}
${pad}  ],
${pad})`;
    }

    if (node.layout.mode === 'vertical') {
      const children = node.children.map((c) => this.generateNodeBody(c, indent + 1)).join(`,\n${pad}  `);
      return `Column(
${pad}  mainAxisAlignment: MainAxisAlignment.${this.mapJustify(node.layout.justify)},
${pad}  crossAxisAlignment: CrossAxisAlignment.${this.mapAlign(node.layout.align)},
${pad}  children: [
${pad}    ${children}
${pad}  ],
${pad})`;
    }

    const decoration = node.style.backgroundColor
      ? `decoration: BoxDecoration(
${pad}    color: Color(0xFF${node.style.backgroundColor.hex.replace('#', '')}),
${node.style.borderRadius ? `${pad}    borderRadius: BorderRadius.circular(${node.style.borderRadius.topLeft}),` : ''}
${pad}  ),`
      : '';

    if (node.children.length === 0) {
      return `Container(
${decoration ? `${pad}  ${decoration}\n` : ''}${pad}  width: ${node.layout.width?.kind === 'fixed' ? node.layout.width.value : 'null'},
${pad}  height: ${node.layout.height?.kind === 'fixed' ? node.layout.height.value : 'null'},
${pad})`;
    }

    const children = node.children.map((c) => this.generateNodeBody(c, indent + 2)).join(`,\n${pad}    `);
    return `Container(
${decoration ? `${pad}  ${decoration}\n` : ''}${pad}  padding: const EdgeInsets.all(${node.layout.padding?.top ?? 0}),
${pad}  child: Column(
${pad}    children: [
${pad}      ${children}
${pad}    ],
${pad}  ),
${pad})`;
  }

  private generateFeatureStructure(context: GeneratorContext): GeneratedFile[] {
    const featureName = context.document.name;
    const snakeName = this.toSnakeCase(featureName);
    return [
      this.createFile(
        `lib/features/${snakeName}/presentation/pages/${snakeName}_page.dart`,
        this.generateFeaturePage(featureName),
        'dart',
        'feature',
      ),
      this.createFile(
        `lib/features/${snakeName}/presentation/bloc/${snakeName}_bloc.dart`,
        this.generateBloc(snakeName),
        'dart',
        'feature',
      ),
      this.createFile(
        `lib/features/${snakeName}/domain/entities/${snakeName}_entity.dart`,
        `class ${this.toPascalCase(featureName)}Entity {\n  const ${this.toPascalCase(featureName)}Entity();\n}\n`,
        'dart',
        'feature',
      ),
      this.createFile(
        `lib/features/${snakeName}/data/repositories/${snakeName}_repository_impl.dart`,
        `class ${this.toPascalCase(featureName)}RepositoryImpl {\n  // TODO: Implement repository\n}\n`,
        'dart',
        'feature',
      ),
    ];
  }

  private generateProjectScaffold(context: GeneratorContext): GeneratedFile[] {
    return [
      this.createFile('lib/main.dart', this.generateMainDart(), 'dart', 'project'),
      this.createFile('lib/core/theme/app_theme.dart', this.generateAppTheme(), 'dart', 'project'),
      this.createFile('lib/core/router/app_router.dart', this.generateRouter(context), 'dart', 'route'),
      this.createFile('pubspec.yaml', this.generatePubspec(), 'yaml', 'config'),
    ];
  }

  private generateFeaturePage(name: string): string {
    const pascal = this.toPascalCase(name);
    const snake = this.toSnakeCase(name);
    return `import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/${snake}_bloc.dart';

class ${pascal}Page extends StatelessWidget {
  const ${pascal}Page({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => ${pascal}Bloc(),
      child: Scaffold(
        appBar: AppBar(title: const Text('${pascal}')),
        body: const Center(child: Text('${pascal}')),
      ),
    );
  }
}
`;
  }

  private generateBloc(name: string): string {
    const pascal = this.toPascalCase(name);
    return `import 'package:flutter_bloc/flutter_bloc.dart';

class ${pascal}Bloc extends Bloc<${pascal}Event, ${pascal}State> {
  ${pascal}Bloc() : super(${pascal}Initial()) {
    on<${pascal}Started>((event, emit) {
      emit(${pascal}Loaded());
    });
  }
}

abstract class ${pascal}Event {}
class ${pascal}Started extends ${pascal}Event {}

abstract class ${pascal}State {}
class ${pascal}Initial extends ${pascal}State {}
class ${pascal}Loaded extends ${pascal}State {}
`;
  }

  private generateMainDart(): string {
    return `import 'package:flutter/material.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';

void main() {
  runApp(const Design2CodeApp());
}

class Design2CodeApp extends StatelessWidget {
  const Design2CodeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Design2Code App',
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      routerConfig: AppRouter.config,
    );
  }
}
`;
  }

  private generateAppTheme(): string {
    return `import 'package:flutter/material.dart';

class AppTheme {
  AppTheme._();

  static ThemeData get light => ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF6366F1)),
  );

  static ThemeData get dark => ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: ColorScheme.fromSeed(
      seedColor: const Color(0xFF6366F1),
      brightness: Brightness.dark,
    ),
  );
}
`;
  }

  private generateRouter(context: GeneratorContext): string {
    const routes = context.document.screens
      .map(
        (s) =>
          `    GoRoute(path: '${s.route ?? '/'}', builder: (context, state) => const ${this.toPascalCase(s.name)}()),`,
      )
      .join('\n');

    return `import 'package:go_router/go_router.dart';

class AppRouter {
  static final config = GoRouter(
    routes: [
${routes || "      GoRoute(path: '/', builder: (context, state) => const Placeholder()),"}
    ],
  );
}
`;
  }

  private generatePubspec(): string {
    return `name: design2code_app
description: Generated by Design2Code AI
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  flutter_bloc: ^8.1.6
  go_router: ^14.6.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^5.0.0
`;
  }

  private generateTest(name: string, _context: GeneratorContext): GeneratedFile {
    return this.createFile(
      `test/widgets/${this.toSnakeCase(name)}_test.dart`,
      `import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('${name} renders', (tester) async {
    // TODO: Add widget test
  });
}
`,
      'dart',
      'test',
    );
  }

  private mapJustify(justify?: string): string {
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

  private mapAlign(align?: string): string {
    const map: Record<string, string> = {
      start: 'start',
      center: 'center',
      end: 'end',
      stretch: 'stretch',
    };
    return map[align ?? 'start'] ?? 'start';
  }
}

function escapeDart(str: string): string {
  return str.replace(/'/g, "\\'").replace(/\n/g, '\\n');
}
