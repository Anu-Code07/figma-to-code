import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createFigmaClient, parseFigmaFile } from '@design2code/figma-parser';
import { createCompiler } from '@design2code/compiler-core';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { loadConfig } from './login.js';
import { resolveAiCredentials } from '../credentials.js';
import type { Framework, GenerationScope } from '@design2code/design-ast';

export const syncCommand = new Command('sync')
  .description('Sync Figma file and regenerate code')
  .requiredOption('--file <key>', 'Figma file key')
  .option('--framework <fw>', 'Target framework', 'react')
  .option('--scope <scope>', 'Generation scope', 'component')
  .option('--output <dir>', 'Output directory', './generated')
  .option('--design-system <path>', 'Path to design.md')
  .option('--project <dir>', 'Existing project root for merge')
  .action(
    async (options: {
      file: string;
      framework: string;
      scope: string;
      output: string;
      designSystem?: string;
      project?: string;
    }) => {
      const config = await loadConfig();
      if (!config.figmaToken) {
        console.error(chalk.red('Not authenticated. Run: design2code login'));
        process.exit(1);
      }

      const spinner = ora('Syncing with Figma...').start();
      try {
        const client = createFigmaClient(config.figmaToken);
        const figmaFile = await client.getFile(options.file);
        const document = parseFigmaFile(figmaFile, { fileKey: options.file });

        const ai = await resolveAiCredentials({ interactive: true });

        const compiler = createCompiler();
        const result = await compiler.compile(document, {
          framework: options.framework as Framework,
          scope: options.scope as GenerationScope,
          designSystemPath: options.designSystem,
          projectRoot: options.project,
          mergeStrategy: options.project ? 'merge' : 'create',
          aiEnabled: true,
          aiProvider: ai.provider,
          aiApiKey: ai.apiKey,
        });

        const outputDir = join(process.cwd(), options.output);
        await mkdir(outputDir, { recursive: true });

        for (const file of result.generation.files) {
          const filePath = join(outputDir, file.path);
          await mkdir(join(filePath, '..'), { recursive: true });
          await writeFile(filePath, file.content);
        }

        spinner.succeed(chalk.green(`Synced ${result.generation.files.length} files`));
      } catch (error) {
        spinner.fail(chalk.red(`Sync failed: ${error instanceof Error ? error.message : error}`));
        process.exit(1);
      }
    },
  );
