import type {
  CompilerOptions,
  DesignDocument,
  GenerationResult,
  MergeStrategy,
} from '@design2code/design-ast';
import type { Generator, GeneratorContext } from '@design2code/generator-sdk';
import { detectComponents } from '@design2code/component-detector';
import { extractTokens, mergeWithDesignSystem } from '@design2code/design-token-engine';
import { createAIEngine } from '@design2code/ai-engine';
import { createProvider } from '@design2code/ai-engine';
import { createMergeEngine, detectProject } from '@design2code/merge-engine';
import type { MergeResult } from '@design2code/merge-engine';
import { getGenerator } from './registry.js';
import { parseDesignMd } from './design-md-parser.js';

export interface CompileOptions extends CompilerOptions {
  aiProvider?: 'claude' | 'openai' | 'local';
  aiApiKey?: string;
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
    // 1. Extract & merge design tokens
    document.tokens = extractTokens(document);

    if (options.designSystemPath) {
      const designSystem = await parseDesignMd(options.designSystemPath);
      document.tokens = mergeWithDesignSystem(document.tokens, designSystem);
    }

    // 2. Component detection
    detectComponents(document);

    // 3. AI optimization
    if (options.aiEnabled !== false) {
      const provider = createProvider(
        options.aiProvider ?? 'local',
        options.aiApiKey ?? process.env.ANTHROPIC_API_KEY ?? process.env.OPENAI_API_KEY,
      );
      const aiEngine = createAIEngine({ provider, enabled: true });
      document = await aiEngine.optimize(document);
    }

    // 4. Detect existing project
    const project = options.projectRoot ? await detectProject(options.projectRoot) : null;

    // 5. Get generator & run pipeline
    const gen = generator ?? getGenerator(options.framework);
    let context: GeneratorContext = {
      options,
      document,
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
