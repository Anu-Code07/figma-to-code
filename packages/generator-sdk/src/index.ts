import type {
  CompilerOptions,
  DesignDocument,
  DesignNode,
  GeneratedFile,
  GenerationResult,
  DesignSystemConfig,
} from '@figma-to-code/design-ast';

export interface ProjectProfile {
  framework: string;
  root: string;
  language: 'typescript' | 'javascript' | 'dart';
  paths: {
    components: string;
    screens: string;
    features: string;
    tokens: string;
    assets: string;
    tests: string;
    src: string;
  };
  conventions: {
    components: 'PascalCase' | 'kebab-case';
    files: 'PascalCase' | 'kebab-case';
    folders: 'PascalCase' | 'kebab-case';
  };
  uiLibrary?: string;
}

export interface GeneratorContext {
  options: CompilerOptions;
  document: DesignDocument;
  designSystem?: DesignSystemConfig;
  project?: ProjectProfile | null;
}

export interface Generator {
  readonly name: string;
  readonly framework: string;
  parse(context: GeneratorContext): Promise<GeneratorContext>;
  transform(context: GeneratorContext): Promise<GeneratorContext>;
  generate(context: GeneratorContext): Promise<GenerationResult>;
  postProcess(result: GenerationResult, context: GeneratorContext): Promise<GenerationResult>;
}

export abstract class BaseGenerator implements Generator {
  abstract readonly name: string;
  abstract readonly framework: string;

  async parse(context: GeneratorContext): Promise<GeneratorContext> {
    return context;
  }

  async transform(context: GeneratorContext): Promise<GeneratorContext> {
    return context;
  }

  abstract generate(context: GeneratorContext): Promise<GenerationResult>;

  async postProcess(result: GenerationResult, _context: GeneratorContext): Promise<GenerationResult> {
    return result;
  }

  protected toPascalCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
  }

  protected toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .toLowerCase()
      .replace(/^-|-$/g, '');
  }

  protected toSnakeCase(str: string): string {
    return this.toKebabCase(str).replace(/-/g, '_');
  }

  protected createFile(
    path: string,
    content: string,
    language: string,
    kind: GeneratedFile['kind'],
    action: GeneratedFile['action'] = 'create',
  ): GeneratedFile {
    return { path, content, language, kind, action };
  }

  protected getOutputPath(
    name: string,
    kind: 'component' | 'screen' | 'feature',
    context: GeneratorContext,
  ): string {
    const profile = context.project;
    const baseName = this.toPascalCase(name);

    if (profile) {
      switch (kind) {
        case 'component':
          return `${profile.paths.components}/${baseName}`;
        case 'screen':
          return `${profile.paths.screens}/${baseName}`;
        case 'feature':
          return `${profile.paths.features}/${this.toKebabCase(name)}`;
      }
    }

    switch (context.options.framework) {
      case 'flutter':
        return kind === 'component'
          ? `lib/shared/widgets/${this.toSnakeCase(name)}`
          : `lib/features/${this.toSnakeCase(name)}`;
      case 'react':
      case 'nextjs':
        return kind === 'component'
          ? `src/components/${baseName}`
          : `src/pages/${baseName}`;
      case 'react-native':
        return kind === 'component'
          ? `src/components/${baseName}`
          : `src/screens/${baseName}`;
      default:
        return `src/${baseName}`;
    }
  }

  protected filterNodesByScope(context: GeneratorContext): DesignNode[] {
    const { document, options } = context;

    if (options.selection?.length) {
      return document.components
        .filter((c) => options.selection!.includes(c.nodeId) || options.selection!.includes(c.name))
        .map((c) => findNodeById(document.root, c.nodeId))
        .filter((n): n is DesignNode => n !== null);
    }

    switch (options.scope) {
      case 'component':
        return document.components
          .map((c) => findNodeById(document.root, c.nodeId))
          .filter((n): n is DesignNode => n !== null);
      case 'screen':
        return document.screens
          .map((s) => findNodeById(document.root, s.nodeId))
          .filter((n): n is DesignNode => n !== null);
      case 'feature':
      case 'project':
        return [document.root];
      default:
        return [document.root];
    }
  }
}

function findNodeById(root: DesignNode, id: string): DesignNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}

export * from './utils.js';
export * from './codegen/index.js';
