import type { GenerationResult, DesignNode, GeneratedFile } from '@design2code/design-ast';
import { BaseGenerator, type GeneratorContext } from '@design2code/generator-sdk';
import {
  ReactFidelityEmitter,
  generateCompoundFiles,
  reactFamilyCompoundHooks,
  FigmaFidelityEngine,
  type ComponentRegistry,
  type CompoundEmitter,
} from '@design2code/generator-sdk';
import { generateCSSVariables, generateTailwindConfig } from '@design2code/design-token-engine';

export class ReactGenerator extends BaseGenerator {
  readonly name = 'react';
  readonly framework = 'react';

  async generate(context: GeneratorContext): Promise<GenerationResult> {
    const files: GeneratedFile[] = [];
    const nodes = this.filterNodesByScope(context);
    const fidelity = new FigmaFidelityEngine();
    const useTailwind =
      context.project?.uiLibrary === 'tailwind' || context.designSystem?.uiLibrary === 'tailwind';

    if (useTailwind) {
      const tailwind = generateTailwindConfig(context.document.tokens);
      files.push(this.createFile(tailwind.path, tailwind.content, 'javascript', 'token'));
    } else {
      const css = generateCSSVariables(context.document.tokens);
      files.push(this.createFile(css.path, css.content, 'css', 'token'));
    }

    const hooks = reactFamilyCompoundHooks(
      (node, name, emitter, registry, imports, _isRoot) =>
        this.generateCompoundComponent(node, name, emitter as ReactFidelityEmitter, registry, imports),
      () => new ReactFidelityEmitter() as CompoundEmitter,
      (rootName) => `src/components/${this.toKebabCase(rootName)}`,
      (plan) => `src/components/${plan.rootName}/${plan.rootName}.tsx`,
    );

    for (const node of nodes) {
      const score = fidelity.fidelityScore(node);
      const { files: compoundFiles } = generateCompoundFiles(
        node,
        context,
        (path, content, language, _kind) =>
          this.createFile(
            path,
            content.replace('FIGMA_FIDELITY_SCORE', String(score)),
            language,
            context.options.scope === 'screen' ? 'screen' : 'component',
          ),
        hooks,
      );
      files.push(...compoundFiles);
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
      metadata: { framework: 'react', nodeCount: nodes.length, figmaFidelity: avgFidelity },
    };
  }

  private generateCompoundComponent(
    node: DesignNode,
    name: string,
    emitter: ReactFidelityEmitter,
    registry: ComponentRegistry,
    imports: string[],
  ): string {
    emitter.setRegistry(registry);
    const body = emitter.renderJSX(node, 4, registry);
    const importBlock = imports.length > 0 ? `${imports.join('\n')}\n\n` : '';

    return `${importBlock}/** Compound component — composes reusable sub-components (Figma fidelity FIGMA_FIDELITY_SCORE%) */
export interface ${name}Props {
  className?: string;
}

export function ${name}({ className }: ${name}Props) {
  return (
    <div className={className}>
${body}
    </div>
  );
}
`;
  }

  private generateFeatureFiles(context: GeneratorContext): GeneratedFile[] {
    const name = this.toPascalCase(context.document.name);
    const kebab = this.toKebabCase(context.document.name);
    const emitter = new ReactFidelityEmitter();
    const body = emitter.renderJSX(context.document.root, 4);

    return [
      this.createFile(
        `src/features/${kebab}/index.ts`,
        `export { ${name}Page } from './pages/${name}Page';\n`,
        'typescript',
        'feature',
      ),
      this.createFile(
        `src/features/${kebab}/pages/${name}Page.tsx`,
        `export function ${name}Page() {\n  return (\n    <div>\n${body}\n    </div>\n  );\n}\n`,
        'typescript',
        'feature',
      ),
      this.createFile(
        `src/features/${kebab}/hooks/use${name}.ts`,
        `export function use${name}() {\n  return {};\n}\n`,
        'typescript',
        'feature',
      ),
      this.createFile(
        `src/features/${kebab}/services/${kebab}Service.ts`,
        `export const ${kebab}Service = {\n  async fetch() { return []; },\n};\n`,
        'typescript',
        'feature',
      ),
    ];
  }

  private generateProjectFiles(_context: GeneratorContext): GeneratedFile[] {
    return [
      this.createFile(
        'src/main.tsx',
        `import { StrictMode } from 'react';\nimport { createRoot } from 'react-dom/client';\nimport { App } from './App';\n\ncreateRoot(document.getElementById('root')!).render(\n  <StrictMode>\n    <App />\n  </StrictMode>,\n);\n`,
        'typescript',
        'project',
      ),
      this.createFile(
        'src/App.tsx',
        `import { BrowserRouter, Routes, Route } from 'react-router-dom';\n\nexport function App() {\n  return (\n    <BrowserRouter>\n      <Routes>\n        <Route path="/" element={<div>Home</div>} />\n      </Routes>\n    </BrowserRouter>\n  );\n}\n`,
        'typescript',
        'project',
      ),
      this.createFile(
        'index.html',
        `<!DOCTYPE html>\n<html lang="en">\n  <head><meta charset="UTF-8" /><title>Design2Code App</title></head>\n  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>\n</html>\n`,
        'html',
        'config',
      ),
    ];
  }
}
