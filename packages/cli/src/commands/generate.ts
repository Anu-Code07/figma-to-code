import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { createCompiler } from '@design2code/compiler-core';
import { createFigmaClient, parseFigmaFile } from '@design2code/figma-parser';
import { formatDiffSummary } from '@design2code/merge-engine';
import type { DesignDocument, Framework, GenerationScope, MergeStrategy } from '@design2code/design-ast';
import { loadConfig } from './login.js';

export const generateCommand = new Command('generate')
  .description('Generate production code from design')
  .option('--framework <fw>', 'Target framework (flutter|react|nextjs|react-native)', 'react')
  .option('--scope <scope>', 'Generation scope (component|screen|feature|project)', 'component')
  .option('--ast <path>', 'Path to design-ast.json', '.design2code/design-ast.json')
  .option('--file <key>', 'Figma file key (imports on the fly)')
  .option('--design-system <path>', 'Path to design.md')
  .option('--project <dir>', 'Existing project root')
  .option('--output <dir>', 'Output directory', './generated')
  .option('--selection <ids>', 'Comma-separated node IDs or component names')
  .option('--merge', 'Merge into existing project')
  .option('--preview', 'Preview diff without writing')
  .option('--replace', 'Replace existing files')
  .option('--routing', 'Include routing')
  .option('--tests', 'Generate tests')
  .option('--storybook', 'Generate Storybook stories')
  .option('--no-ai', 'Disable AI optimization')
  .action(async (options) => {
    const config = await loadConfig();
    const spinner = ora('Compiling design...').start();

    try {
      let document: DesignDocument;

      if (options.file) {
        if (!config.figmaToken) {
          spinner.fail(chalk.red('Figma token required. Run: design2code login'));
          process.exit(1);
        }
        const client = createFigmaClient(config.figmaToken);
        const figmaFile = await client.getFile(options.file);
        document = parseFigmaFile(figmaFile, { fileKey: options.file });
      } else {
        const astPath = join(process.cwd(), options.ast);
        if (!existsSync(astPath)) {
          spinner.fail(chalk.red(`Design AST not found: ${astPath}`));
          process.exit(1);
        }
        document = JSON.parse(await readFile(astPath, 'utf-8')) as DesignDocument;
      }

      const mergeStrategy: MergeStrategy = options.preview
        ? 'preview'
        : options.replace
          ? 'replace'
          : options.merge
            ? 'merge'
            : 'create';

      const designSystemPath = options.designSystem
        ? join(process.cwd(), options.designSystem)
        : existsSync(join(process.cwd(), 'design.md'))
          ? join(process.cwd(), 'design.md')
          : undefined;

      const compiler = createCompiler();
      const result = await compiler.compile(document, {
        framework: options.framework as Framework,
        scope: options.scope as GenerationScope,
        designSystemPath,
        projectRoot: options.project ?? (options.merge ? process.cwd() : undefined),
        outputDir: options.output,
        selection: options.selection?.split(',').map((s: string) => s.trim()),
        mergeStrategy,
        includeRouting: options.routing,
        includeTests: options.tests,
        includeStorybook: options.storybook,
        aiEnabled: options.ai !== false,
        aiProvider: config.anthropicApiKey ? 'claude' : config.openaiApiKey ? 'openai' : 'local',
        aiApiKey: config.anthropicApiKey ?? config.openaiApiKey,
        dryRun: options.preview,
      });

      if (!options.preview && !options.merge) {
        const outputDir = join(process.cwd(), options.output);
        for (const file of result.generation.files) {
          const filePath = join(outputDir, file.path);
          await mkdir(join(filePath, '..'), { recursive: true });
          await writeFile(filePath, file.content);
        }
      }

      spinner.succeed(
        chalk.green(
          `Generated ${result.generation.files.length} files (${options.framework}/${options.scope})`,
        ),
      );

      if (result.merge) {
        console.log(chalk.bold('\nMerge summary:'), formatDiffSummary(result.merge.diffs));
        if (options.preview) {
          for (const diff of result.merge.diffs) {
            console.log(chalk.cyan(`\n── ${diff.path} [${diff.action}]`));
            for (const hunk of diff.hunks) {
              hunk.lines.slice(0, 10).forEach((l) => console.log(chalk.dim(l)));
            }
          }
        } else {
          console.log(chalk.green(`  Created: ${result.merge.created.length}`));
          console.log(chalk.yellow(`  Updated: ${result.merge.updated.length}`));
          console.log(chalk.dim(`  Skipped: ${result.merge.skipped.length}`));
        }
      }

      if (!options.preview && !options.merge) {
        console.log(chalk.dim(`\nOutput: ${join(process.cwd(), options.output)}`));
      }
    } catch (error) {
      spinner.fail(chalk.red(`Generation failed: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });
