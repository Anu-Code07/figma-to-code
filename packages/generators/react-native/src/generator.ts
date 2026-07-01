import type { GenerationResult, DesignNode, GeneratedFile } from '@design2code/design-ast';
import { BaseGenerator, type GeneratorContext } from '@design2code/generator-sdk';
import { ReactNativeFidelityEmitter } from '@design2code/generator-sdk';
import { generateReactNativeTheme } from '@design2code/design-token-engine';
import { FigmaFidelityEngine } from '@design2code/generator-sdk';

export class ReactNativeGenerator extends BaseGenerator {
  readonly name = 'react-native';
  readonly framework = 'react-native';

  async generate(context: GeneratorContext): Promise<GenerationResult> {
    const files: GeneratedFile[] = [];
    const nodes = this.filterNodesByScope(context);
    const fidelity = new FigmaFidelityEngine();

    const theme = generateReactNativeTheme(context.document.tokens);
    files.push(this.createFile(theme.path, theme.content, 'typescript', 'token'));

    for (const node of nodes) {
      const name = this.toPascalCase(node.name);
      const kind = context.options.scope === 'screen' ? 'screen' : 'component';
      const basePath = this.getOutputPath(node.name, kind, context);
      const score = fidelity.fidelityScore(node);
      files.push(
        this.createFile(
          `${basePath}/${name}.tsx`,
          this.generateComponent(node, name, score),
          'typescript',
          kind,
        ),
      );
    }

    if (context.options.scope === 'feature') {
      files.push(...this.generateFeatureFiles(context));
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

  private generateComponent(node: DesignNode, name: string, score: number): string {
    const emitter = new ReactNativeFidelityEmitter();
    emitter.styleEntries.set('root', {
      flex: 1,
      ...(node.style.backgroundColor?.hex ? { backgroundColor: node.style.backgroundColor.hex } : {}),
    });
    const body = emitter.renderJSX(node, 4);
    const styleSheet = emitter.toStyleSheet();

    return `import { View, Text, Pressable, StyleSheet } from 'react-native';

export interface ${name}Props {
  testID?: string;
}

/** Pixel-perfect component — Figma fidelity ${score}% */
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

  private generateFeatureFiles(context: GeneratorContext): GeneratedFile[] {
    const name = this.toPascalCase(context.document.name);
    const kebab = this.toKebabCase(context.document.name);
    const emitter = new ReactNativeFidelityEmitter();
    const body = emitter.renderJSX(context.document.root, 4);
    const styleSheet = emitter.toStyleSheet();

    return [
      this.createFile(
        `src/features/${kebab}/screens/${name}Screen.tsx`,
        `import { View, Text, Pressable, StyleSheet } from 'react-native';\n\nexport function ${name}Screen() {\n  return (\n    <View style={styles.screen}>\n${body}\n    </View>\n  );\n}\n\n${styleSheet}\n`,
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
