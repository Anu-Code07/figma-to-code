import type { GenerationResult, DesignNode, GeneratedFile } from '@design2code/design-ast';
import { BaseGenerator, type GeneratorContext } from '@design2code/generator-sdk';
import { generateCSSVariables, generateTailwindConfig } from '@design2code/design-token-engine';

export class ReactGenerator extends BaseGenerator {
  readonly name = 'react';
  readonly framework = 'react';

  async generate(context: GeneratorContext): Promise<GenerationResult> {
    const files: GeneratedFile[] = [];
    const nodes = this.filterNodesByScope(context);
    const useTailwind = context.project?.uiLibrary === 'tailwind' || context.designSystem?.uiLibrary === 'tailwind';

    if (useTailwind) {
      const tailwind = generateTailwindConfig(context.document.tokens);
      files.push(this.createFile(tailwind.path, tailwind.content, 'javascript', 'token'));
    } else {
      const css = generateCSSVariables(context.document.tokens);
      files.push(this.createFile(css.path, css.content, 'css', 'token'));
    }

    for (const node of nodes) {
      const name = this.toPascalCase(node.name);
      const basePath = this.getOutputPath(node.name, context.options.scope === 'screen' ? 'screen' : 'component', context);
      files.push(
        this.createFile(
          `${basePath}/${name}.tsx`,
          this.generateComponent(node, name, useTailwind),
          'typescript',
          context.options.scope === 'screen' ? 'screen' : 'component',
        ),
      );
      files.push(
        this.createFile(`${basePath}/${name}.module.css`, this.generateCSSModule(node, name), 'css', 'component'),
      );
    }

    if (context.options.scope === 'feature') {
      files.push(...this.generateFeatureFiles(context));
    }

    if (context.options.scope === 'project') {
      files.push(...this.generateProjectFiles(context));
    }

    return { files, warnings: [], metadata: { framework: 'react', nodeCount: nodes.length } };
  }

  private generateComponent(node: DesignNode, name: string, useTailwind: boolean): string {
    const body = this.generateJSX(node, 4, useTailwind);
    const a11y = node.accessibility?.label ? `\n      aria-label="${node.accessibility.label}"` : '';

    return `import styles from './${name}.module.css';

export interface ${name}Props {
  className?: string;
}

export function ${name}({ className }: ${name}Props) {
  return (
    <div className={\`\${styles.root} \${className ?? ''}\`.trim()}${a11y ? `${a11y}` : ''}>
${body}
    </div>
  );
}
`;
  }

  private generateJSX(node: DesignNode, indent: number, useTailwind: boolean): string {
    const pad = '  '.repeat(indent);

    if (node.semanticType === 'button') {
      const label = node.text?.content ?? node.name;
      return `${pad}<button type="button" className={styles.button}>\n${pad}  ${label}\n${pad}</button>`;
    }

    if (node.type === 'text' && node.text) {
      const Tag = node.text.fontSize && node.text.fontSize > 20 ? 'h2' : 'p';
      return `${pad}<${Tag} className={styles.text}>${escapeHtml(node.text.content)}</${Tag}>`;
    }

    if (node.layout.mode === 'horizontal') {
      const children = node.children.map((c) => this.generateJSX(c, indent + 1, useTailwind)).join('\n');
      return `${pad}<div className={styles.row}>\n${children}\n${pad}</div>`;
    }

    if (node.layout.mode === 'vertical') {
      const children = node.children.map((c) => this.generateJSX(c, indent + 1, useTailwind)).join('\n');
      return `${pad}<div className={styles.column}>\n${children}\n${pad}</div>`;
    }

    if (node.children.length === 0) {
      return `${pad}<div className={styles.container} />`;
    }

    const children = node.children.map((c) => this.generateJSX(c, indent + 1, useTailwind)).join('\n');
    return `${pad}<div className={styles.container}>\n${children}\n${pad}</div>`;
  }

  private generateCSSModule(node: DesignNode, _name: string): string {
    const bg = node.style.backgroundColor?.hex ?? '#ffffff';
    const radius = node.style.borderRadius?.topLeft ?? 0;
    const padding = node.layout.padding?.top ?? 0;

    return `.root {
  display: flex;
  flex-direction: column;
  background-color: ${bg};
  border-radius: ${radius}px;
  padding: ${padding}px;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.column {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.button {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background-color: #6366f1;
  color: white;
  cursor: pointer;
  font-weight: 600;
}

.button:hover {
  opacity: 0.9;
}

.text {
  margin: 0;
  color: ${node.text?.color?.hex ?? '#1a1a1a'};
}
`;
  }

  private generateFeatureFiles(context: GeneratorContext): GeneratedFile[] {
    const name = this.toPascalCase(context.document.name);
    const kebab = this.toKebabCase(context.document.name);
    return [
      this.createFile(`src/features/${kebab}/index.ts`, `export { ${name}Page } from './pages/${name}Page';\n`, 'typescript', 'feature'),
      this.createFile(`src/features/${kebab}/pages/${name}Page.tsx`, `export function ${name}Page() {\n  return <div>${name}</div>;\n}\n`, 'typescript', 'feature'),
      this.createFile(`src/features/${kebab}/hooks/use${name}.ts`, `export function use${name}() {\n  return {};\n}\n`, 'typescript', 'feature'),
      this.createFile(`src/features/${kebab}/services/${kebab}Service.ts`, `export const ${kebab}Service = {\n  async fetch() { return []; },\n};\n`, 'typescript', 'feature'),
    ];
  }

  private generateProjectFiles(_context: GeneratorContext): GeneratedFile[] {
    return [
      this.createFile('src/main.tsx', `import { StrictMode } from 'react';\nimport { createRoot } from 'react-dom/client';\nimport { App } from './App';\n\ncreateRoot(document.getElementById('root')!).render(\n  <StrictMode>\n    <App />\n  </StrictMode>,\n);\n`, 'typescript', 'project'),
      this.createFile('src/App.tsx', `import { BrowserRouter, Routes, Route } from 'react-router-dom';\n\nexport function App() {\n  return (\n    <BrowserRouter>\n      <Routes>\n        <Route path="/" element={<div>Home</div>} />\n      </Routes>\n    </BrowserRouter>\n  );\n}\n`, 'typescript', 'project'),
      this.createFile('index.html', `<!DOCTYPE html>\n<html lang="en">\n  <head><meta charset="UTF-8" /><title>Design2Code App</title></head>\n  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>\n</html>\n`, 'html', 'config'),
    ];
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
