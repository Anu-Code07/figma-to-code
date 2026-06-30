import type { GenerationResult, DesignNode, GeneratedFile } from '@design2code/design-ast';
import { BaseGenerator, type GeneratorContext } from '@design2code/generator-sdk';
import { generateReactNativeTheme } from '@design2code/design-token-engine';

export class ReactNativeGenerator extends BaseGenerator {
  readonly name = 'react-native';
  readonly framework = 'react-native';

  async generate(context: GeneratorContext): Promise<GenerationResult> {
    const files: GeneratedFile[] = [];
    const nodes = this.filterNodesByScope(context);

    const theme = generateReactNativeTheme(context.document.tokens);
    files.push(this.createFile(theme.path, theme.content, 'typescript', 'token'));

    for (const node of nodes) {
      const name = this.toPascalCase(node.name);
      const kind = context.options.scope === 'screen' ? 'screen' : 'component';
      const basePath = this.getOutputPath(node.name, kind, context);
      files.push(
        this.createFile(
          `${basePath}/${name}.tsx`,
          this.generateComponent(node, name),
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

    return { files, warnings: [], metadata: { framework: 'react-native', nodeCount: nodes.length } };
  }

  private generateComponent(node: DesignNode, name: string): string {
    const body = this.generateRNJSX(node, 4);
    return `import { View, Text, StyleSheet } from 'react-native';

export interface ${name}Props {
  testID?: string;
}

export function ${name}({ testID }: ${name}Props) {
  return (
    <View style={styles.root} testID={testID}>
${body}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '${node.style.backgroundColor?.hex ?? '#ffffff'}',
    padding: ${node.layout.padding?.top ?? 16},
    borderRadius: ${node.style.borderRadius?.topLeft ?? 0},
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  column: {
    flexDirection: 'column',
    gap: 8,
  },
  button: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },
  text: {
    fontSize: ${node.text?.fontSize ?? 16},
    color: '${node.text?.color?.hex ?? '#1a1a1a'}',
  },
});
`;
  }

  private generateRNJSX(node: DesignNode, indent: number): string {
    const pad = '  '.repeat(indent);

    if (node.semanticType === 'button') {
      const label = node.text?.content ?? node.name;
      return `${pad}<View style={styles.button} accessibilityRole="button">
${pad}  <Text style={styles.buttonText}>${escapeJsx(label)}</Text>
${pad}</View>`;
    }

    if (node.type === 'text' && node.text) {
      return `${pad}<Text style={styles.text}>${escapeJsx(node.text.content)}</Text>`;
    }

    if (node.layout.mode === 'horizontal') {
      const children = node.children.map((c) => this.generateRNJSX(c, indent + 1)).join('\n');
      return `${pad}<View style={styles.row}>\n${children}\n${pad}</View>`;
    }

    if (node.layout.mode === 'vertical' || node.children.length > 1) {
      const children = node.children.map((c) => this.generateRNJSX(c, indent + 1)).join('\n');
      return `${pad}<View style={styles.column}>\n${children}\n${pad}</View>`;
    }

    if (node.children.length === 1) {
      return this.generateRNJSX(node.children[0], indent);
    }

    return `${pad}<View />`;
  }

  private generateFeatureFiles(context: GeneratorContext): GeneratedFile[] {
    const name = this.toPascalCase(context.document.name);
    const kebab = this.toKebabCase(context.document.name);
    return [
      this.createFile(`src/features/${kebab}/screens/${name}Screen.tsx`, `import { View, Text } from 'react-native';\n\nexport function ${name}Screen() {\n  return (\n    <View>\n      <Text>${name}</Text>\n    </View>\n  );\n}\n`, 'typescript', 'feature'),
      this.createFile(`src/features/${kebab}/hooks/use${name}.ts`, `export function use${name}() {\n  return { loading: false, data: null };\n}\n`, 'typescript', 'feature'),
      this.createFile(`src/features/${kebab}/services/${kebab}Api.ts`, `export const ${kebab}Api = {\n  fetch: async () => [],\n};\n`, 'typescript', 'feature'),
    ];
  }

  private generateProjectFiles(_context: GeneratorContext): GeneratedFile[] {
    return [
      this.createFile('App.tsx', `import { NavigationContainer } from '@react-navigation/native';\nimport { createNativeStackNavigator } from '@react-navigation/native-stack';\nimport { HomeScreen } from './src/screens/HomeScreen';\n\nconst Stack = createNativeStackNavigator();\n\nexport default function App() {\n  return (\n    <NavigationContainer>\n      <Stack.Navigator>\n        <Stack.Screen name="Home" component={HomeScreen} />\n      </Stack.Navigator>\n    </NavigationContainer>\n  );\n}\n`, 'typescript', 'project'),
      this.createFile('src/screens/HomeScreen.tsx', `import { View, Text, StyleSheet } from 'react-native';\n\nexport function HomeScreen() {\n  return (\n    <View style={styles.container}>\n      <Text style={styles.title}>Design2Code App</Text>\n    </View>\n  );\n}\n\nconst styles = StyleSheet.create({\n  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },\n  title: { fontSize: 24, fontWeight: 'bold' },\n});\n`, 'typescript', 'screen'),
      this.createFile('app.json', `{\n  "expo": {\n    "name": "Design2Code App",\n    "slug": "design2code-app",\n    "version": "1.0.0",\n    "orientation": "portrait",\n    "platforms": ["ios", "android"]\n  }\n}\n`, 'json', 'config'),
    ];
  }
}

function escapeJsx(str: string): string {
  return str.replace(/'/g, "\\'").replace(/\n/g, ' ');
}
