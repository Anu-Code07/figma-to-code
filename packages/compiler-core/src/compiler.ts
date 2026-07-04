import type {
  CompilerOptions,
  DesignDocument,
  GenerationResult,
  MergeStrategy,
} from '@figma-to-code/design-ast';
import type { Generator, GeneratorContext } from '@figma-to-code/generator-sdk';
import { detectComponents } from '@figma-to-code/component-detector';
import { extractTokens, mergeWithDesignSystem } from '@figma-to-code/design-token-engine';
import { createAIEngine, createProvider, createUIFidelityEnhancer, type HostCompleteFn } from '@figma-to-code/ai-engine';
import { createMergeEngine, detectProject } from '@figma-to-code/merge-engine';
import type { MergeResult } from '@figma-to-code/merge-engine';
import { getGenerator } from './registry.js';
import { parseDesignMd } from './design-md-parser.js';

export interface CompileOptions extends CompilerOptions {
  aiProvider?: 'claude' | 'openai' | 'local' | 'host';
  aiApiKey?: string;
  /** MCP host LLM callback (Cursor / Claude Desktop sampling) */
  hostComplete?: HostCompleteFn;
}

export interface CompileResult {
  generation: GenerationResult;
  merge?: MergeResult;
  document: DesignDocument;
}

export class DesignCompiler {
  async compile(
    document: DesignDocument,
    options: CompileOptions,
    generator?: Generator,
  ): Promise<CompileResult> {
    // 1. Extract design tokens
    document.tokens = extractTokens(document);

    // 2. Load design system & merge tokens
    let designSystem;
    if (options.designSystemPath) {
      designSystem = await parseDesignMd(options.designSystemPath);
      document.tokens = mergeWithDesignSystem(document.tokens, designSystem);
    }

    // 3. Component detection
    detectComponents(document);

    // 4. AI optimization (rule-based + optional LLM)
    if (options.aiEnabled !== false) {
      const provider = createProvider(
        options.aiProvider ?? 'local',
        options.aiApiKey ?? process.env.ANTHROPIC_API_KEY ?? process.env.OPENAI_API_KEY,
        options.hostComplete,
      );
      const aiEngine = createAIEngine({ provider, enabled: true });
      document = await aiEngine.optimize(document);

      const usesLlm =
        provider.name === 'claude' ||
        provider.name === 'openai' ||
        (provider.name === 'host' && options.hostComplete !== undefined);

      const uiEnhancer = createUIFidelityEnhancer({ provider, enabled: usesLlm });
      document = await uiEnhancer.enhance(document);
    }

    // 5. Detect existing project
    const project = options.projectRoot ? await detectProject(options.projectRoot) : null;

    // 5. Get generator & run pipeline
    const gen = generator ?? getGenerator(options.framework);
    let context: GeneratorContext = {
      options,
      document,
      designSystem,
      project,
    };

    context = await gen.parse(context);
    context = await gen.transform(context);
    let generation = await gen.generate(context);
    generation = await gen.postProcess(generation, context);
    generation.ast = document;
    generation.tokens = document.tokens;

    // 6. Apply merge if project exists
    let merge: MergeResult | undefined;
    if (options.projectRoot && options.mergeStrategy && options.mergeStrategy !== 'preview') {
      const mergeEngine = createMergeEngine();
      merge = await mergeEngine.apply(generation.files, {
        projectRoot: options.projectRoot,
        strategy: options.mergeStrategy,
        dryRun: options.dryRun,
      });
    } else if (options.projectRoot && options.mergeStrategy === 'preview') {
      const mergeEngine = createMergeEngine();
      merge = await mergeEngine.apply(generation.files, {
        projectRoot: options.projectRoot,
        strategy: 'preview',
        dryRun: true,
      });
    }

    return { generation, merge, document };
  }
}

export function createCompiler(): DesignCompiler {
  return new DesignCompiler();
}

export type { MergeStrategy };
