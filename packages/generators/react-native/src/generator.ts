import type { GenerationResult, DesignNode, GeneratedFile } from '@figma-to-code/design-ast';
import { BaseGenerator, type GeneratorContext } from '@figma-to-code/generator-sdk';
import {
  ReactNativeFidelityEmitter,
  generateCompoundFiles,
  reactFamilyCompoundHooks,
  FigmaFidelityEngine,
  type ComponentRegistry,
  type CompoundEmitter,
  type CompoundPlan,
} from '@figma-to-code/generator-sdk';
import { generateReactNativeTheme } from '@figma-to-code/design-token-engine';

export class ReactNativeGenerator extends BaseGenerator {
  readonly name = 'react-native';
  readonly framework = 'react-native';

  async generate(context: GeneratorContext): Promise<GenerationResult> {
    const files: GeneratedFile[] = [];
    const nodes = this.filterNodesByScope(context);
    const fidelity = new FigmaFidelityEngine();

    const theme = generateReactNativeTheme(context.document.tokens);
    files.push(this.createFile(theme.path, theme.content, 'typescript', 'token'));

    const isFeatureScope = context.options.scope === 'feature';
    const hooks = this.createHooks(isFeatureScope);

    for (const node of nodes) {
      const score = fidelity.fidelityScore(node);
      const kind = context.options.scope === 'screen' ? 'screen' : 'component';
      const { files: compoundFiles, plan } = generateCompoundFiles(
        node,
        context,
        (path, content, language) =>
          this.createFile(
            path,
            content.replace('FIGMA_FIDELITY_SCORE', String(score)),
            language,
            isFeatureScope ? 'feature' : kind,
          ),
        hooks,
      );
      files.push(...compoundFiles);

      if (isFeatureScope) {
        files.push(...this.generateFeatureFiles(context, plan));
      }
    }

    if (context.options.scope === 'project') {
      files.push(...this.generateProjectFiles(context));
    }

    const avgFidelity =
      nodes.length > 0
        ? Math.round(nodes.reduce((sum, n) => sum + fidelity.fidelityScore(n), 0) / nodes.length)
        : 0;

    return {
      files,
      warnings: [],
      metadata: { framework: 'react-native', nodeCount: nodes.length, figmaFidelity: avgFidelity },
    };
  }

  private createHooks(isFeatureScope: boolean) {
    return reactFamilyCompoundHooks(
      (node, name, emitter, registry, imports, _isRoot) =>
        this.generateCompoundComponent(
          node,
          name,
          emitter as ReactNativeFidelityEmitter,
          registry,
          imports,
        ),
      () => new ReactNativeFidelityEmitter() as CompoundEmitter,
      (rootName, ctx) =>
        isFeatureScope
          ? `src/features/${this.toKebabCase(ctx.document.name)}/components/${this.toKebabCase(rootName)}`
          : `src/components/${this.toKebabCase(rootName)}`,
      (plan, ctx) =>
        isFeatureScope
          ? `src/features/${this.toKebabCase(ctx.document.name)}/components/${plan.rootName}/${plan.rootName}.tsx`
          : `src/components/${plan.rootName}/${plan.rootName}.tsx`,
    );
  }

  private generateCompoundComponent(
    node: DesignNode,
    name: string,
    emitter: ReactNativeFidelityEmitter,
    registry: ComponentRegistry,
    imports: string[],
  ): string {
    emitter.setRegistry(registry);
    emitter.styleEntries.set('root', {
      flex: 1,
      ...(node.style.backgroundColor?.hex ? { backgroundColor: node.style.backgroundColor.hex } : {}),
    });
    const body = emitter.renderJSX(node, 4, registry);
    const styleSheet = emitter.toStyleSheet();
    const importBlock = imports.length > 0 ? `${imports.join('\n')}\n` : '';

    return `${importBlock}import { View, Text, Pressable, StyleSheet } from 'react-native';

export interface ${name}Props {
  testID?: string;
}

/** Compound component — composes reusable sub-components (Figma fidelity FIGMA_FIDELITY_SCORE%) */
export function ${name}({ testID }: ${name}Props) {
  return (
    <View style={styles.root} testID={testID}>
${body}
    </View>
  );
}

${styleSheet}
`;
  }

  private generateFeatureFiles(context: GeneratorContext, plan: CompoundPlan): GeneratedFile[] {
    const name = this.toPascalCase(context.document.name);
    const kebab = this.toKebabCase(context.document.name);
    const compoundKebab = this.toKebabCase(plan.rootName);

    return [
      this.createFile(
        `src/features/${kebab}/screens/${name}Screen.tsx`,
        `import { View, StyleSheet } from 'react-native';\nimport { ${plan.rootName} } from '../components/${compoundKebab}';\n\nexport function ${name}Screen() {\n  return (\n    <View style={styles.screen}>\n      <${plan.rootName} />\n    </View>\n  );\n}\n\nconst styles = StyleSheet.create({\n  screen: { flex: 1 },\n});\n`,
        'typescript',
        'feature',
      ),
    ];
  }

  private generateProjectFiles(_context: GeneratorContext): GeneratedFile[] {
    return [
      this.createFile(
        'App.tsx',
        `import { NavigationContainer } from '@react-navigation/native';\nimport { createNativeStackNavigator } from '@react-navigation/native-stack';\nimport { HomeScreen } from './src/screens/HomeScreen';\n\nconst Stack = createNativeStackNavigator();\n\nexport default function App() {\n  return (\n    <NavigationContainer>\n      <Stack.Navigator screenOptions={{ headerShown: true }}>\n        <Stack.Screen name="Home" component={HomeScreen} />\n      </Stack.Navigator>\n    </NavigationContainer>\n  );\n}\n`,
        'typescript',
        'project',
      ),
      this.createFile(
        'src/screens/HomeScreen.tsx',
        `import { View, Text, StyleSheet } from 'react-native';\nimport { theme } from '../theme/tokens';\n\nexport function HomeScreen() {\n  return (\n    <View style={styles.container}>\n      <Text style={styles.title}>Design2Code App</Text>\n    </View>\n  );\n}\n\nconst styles = StyleSheet.create({\n  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background ?? '#fff' },\n  title: { fontSize: 24, fontWeight: '700' },\n});\n`,
        'typescript',
        'screen',
      ),
      this.createFile(
        'app.json',
        `{\n  "expo": {\n    "name": "Design2Code App",\n    "slug": "design2code-app",\n    "version": "1.0.0",\n    "orientation": "portrait",\n    "platforms": ["ios", "android"]\n  }\n}\n`,
        'json',
        'config',
      ),
    ];
  }
}
