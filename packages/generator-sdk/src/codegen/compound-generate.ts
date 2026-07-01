import type { DesignNode, GeneratedFile } from '@design2code/design-ast';
import type { GeneratorContext } from '../index.js';
import {
  type CompoundPlan,
  type ExtractedComponent,
  ComponentRegistry,
  planCompoundComponents,
  renderFlutterCompoundBarrel,
  renderReactCompoundBarrel,
  toKebabCase,
  toSnakeCase,
} from './compound-plan.js';

export interface CompoundGenerationResult {
  files: GeneratedFile[];
  plan: CompoundPlan;
}

type CreateFileFn = (
  path: string,
  content: string,
  language: string,
  kind: GeneratedFile['kind'],
) => GeneratedFile;

/** Generate compound component file set for a root AST node */
export function generateCompoundFiles(
  root: DesignNode,
  context: GeneratorContext,
  createFile: CreateFileFn,
  hooks: CompoundFrameworkHooks,
): CompoundGenerationResult {
  const plan = planCompoundComponents(root, context.document);
  const registry = new ComponentRegistry(plan);
  const files: GeneratedFile[] = [];

  // Single component with no extractable children — flat file, no folder
  if (plan.components.length === 0) {
    registry.setGeneratingNodeId(root.id);
    const emitter = hooks.createEmitter(context);
    emitter.setRegistry(registry);
    const content = hooks.renderComponent(root, plan.rootName, emitter, registry, [], true);
    const path = hooks.getFlatPath(plan, context);
    files.push(createFile(path, content, hooks.language, hooks.rootKind));
    registry.clearGeneratingNodeId();
    return { files, plan };
  }

  const baseDir = hooks.getBaseDir(plan.rootName, context);

  // Sub-components first (deepest first — already sorted in plan)
  for (const sub of plan.components) {
    registry.setGeneratingNodeId(sub.nodeId);
    const subEmitter = hooks.createEmitter(context);
    subEmitter.setRegistry(registry);
    const content = hooks.renderComponent(sub.node, sub.name, subEmitter, registry, [], false);
    files.push(createFile(hooks.getSubPath(baseDir, sub), content, hooks.language, hooks.subKind));
  }

  // Root parent composes sub-components
  registry.setGeneratingNodeId(root.id);
  const rootEmitter = hooks.createEmitter(context);
  rootEmitter.setRegistry(registry);
  const rootImports = plan.components.map(
    (c) => hooks.formatImport(c, baseDir, context),
  );
  const rootContent = hooks.renderComponent(root, plan.rootName, rootEmitter, registry, rootImports, true);
  files.push(createFile(hooks.getRootPath(baseDir, plan), rootContent, hooks.language, hooks.rootKind));

  if (hooks.renderBarrel) {
    files.push(
      createFile(hooks.getBarrelPath(baseDir), hooks.renderBarrel(plan), hooks.language, 'component'),
    );
  }

  registry.clearGeneratingNodeId();
  return { files, plan };
}

export interface CompoundEmitter {
  setRegistry(registry: ComponentRegistry): void;
}

export interface CompoundFrameworkHooks {
  language: string;
  rootKind: GeneratedFile['kind'];
  subKind: GeneratedFile['kind'];
  getFlatPath(plan: CompoundPlan, context: GeneratorContext): string;
  getBaseDir(rootName: string, context: GeneratorContext): string;
  getRootPath(baseDir: string, plan: CompoundPlan): string;
  getSubPath(baseDir: string, sub: ExtractedComponent): string;
  getBarrelPath(baseDir: string): string;
  formatImport(sub: ExtractedComponent, baseDir: string, context: GeneratorContext): string;
  createEmitter(context: GeneratorContext): CompoundEmitter;
  renderComponent(
    node: DesignNode,
    name: string,
    emitter: CompoundEmitter,
    registry: ComponentRegistry,
    imports: string[],
    isRoot: boolean,
  ): string;
  renderBarrel?(plan: CompoundPlan): string;
}

export function flutterCompoundHooks(
  renderWidget: (
    node: DesignNode,
    name: string,
    emitter: CompoundEmitter,
    registry: ComponentRegistry,
    imports: string[],
  ) => string,
  createEmitter: (context: GeneratorContext) => CompoundEmitter,
): CompoundFrameworkHooks {
  return {
    language: 'dart',
    rootKind: 'component',
    subKind: 'component',
    getFlatPath: (plan) => `lib/shared/widgets/${toSnakeCase(plan.rootName)}.dart`,
    getBaseDir: (rootName) => `lib/shared/widgets/${toSnakeCase(rootName)}`,
    getRootPath: (baseDir, plan) => `${baseDir}/${toSnakeCase(plan.rootName)}.dart`,
    getSubPath: (baseDir, sub) => `${baseDir}/${toSnakeCase(sub.name)}.dart`,
    getBarrelPath: (baseDir) => `${baseDir}/widgets.dart`,
    formatImport: (sub) => `import '${toSnakeCase(sub.name)}.dart';`,
    createEmitter,
    renderComponent: (node, name, emitter, registry, imports) =>
      renderWidget(node, name, emitter, registry, imports),
    renderBarrel: (plan) =>
      renderFlutterCompoundBarrel(toSnakeCase(plan.rootName), plan.components),
  };
}

export function reactFamilyCompoundHooks(
  renderComponent: (
    node: DesignNode,
    name: string,
    emitter: CompoundEmitter,
    registry: ComponentRegistry,
    imports: string[],
    isRoot: boolean,
  ) => string,
  createEmitter: (context: GeneratorContext) => CompoundEmitter,
  getBaseDir: (rootName: string, context: GeneratorContext) => string,
  getFlatPath: (plan: CompoundPlan, context: GeneratorContext) => string,
): CompoundFrameworkHooks {
  return {
    language: 'typescript',
    rootKind: 'component',
    subKind: 'component',
    getFlatPath,
    getBaseDir,
    getRootPath: (baseDir, plan) => `${baseDir}/${plan.rootName}.tsx`,
    getSubPath: (baseDir, sub) => `${baseDir}/${sub.name}.tsx`,
    getBarrelPath: (baseDir) => `${baseDir}/index.ts`,
    formatImport: (sub) => `import { ${sub.name} } from './${sub.name}';`,
    createEmitter,
    renderComponent,
    renderBarrel: (plan) => renderReactCompoundBarrel(plan.rootName, plan.components),
  };
}

export { planCompoundComponents, ComponentRegistry, toKebabCase, toSnakeCase };
