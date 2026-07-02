import { Command } from 'commander';
import chalk from 'chalk';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { createCompiler } from '@design2code/compiler-core';
import type { DesignDocument } from '@design2code/design-ast';
import type { Framework, GenerationScope } from '@design2code/design-ast';
import { resolveAiCredentials } from '../credentials.js';

export const previewCommand = new Command('preview')
  .description('Preview generated code without writing files')
  .option('--ast <path>', 'Path to design-ast.json', '.design2code/design-ast.json')
  .option('--framework <fw>', 'Target framework', 'react')
  .option('--scope <scope>', 'Generation scope', 'component')
  .option('--design-system <path>', 'Path to design.md')
  .action(
    async (options: {
      ast: string;
      framework: string;
      scope: string;
      designSystem?: string;
    }) => {
      const astPath = join(process.cwd(), options.ast);
      if (!existsSync(astPath)) {
        console.error(chalk.red(`Design AST not found: ${astPath}`));
        console.log(chalk.dim('Run: design2code import --file <figma-key>'));
        process.exit(1);
      }

      const document = JSON.parse(await readFile(astPath, 'utf-8')) as DesignDocument;
      const ai = await resolveAiCredentials({ interactive: true });
      const compiler = createCompiler();

      const result = await compiler.compile(document, {
        framework: options.framework as Framework,
        scope: options.scope as GenerationScope,
        designSystemPath: options.designSystem,
        mergeStrategy: 'preview',
        dryRun: true,
        aiEnabled: true,
        aiProvider: ai.provider,
        aiApiKey: ai.apiKey,
      });

      console.log(chalk.bold(`\nPreview: ${result.generation.files.length} files\n`));

      for (const file of result.generation.files) {
        console.log(chalk.cyan(`── ${file.path} (${file.language})`));
        const preview = file.content.split('\n').slice(0, 20).join('\n');
        console.log(chalk.dim(preview));
        if (file.content.split('\n').length > 20) {
          console.log(chalk.dim(`... ${file.content.split('\n').length - 20} more lines`));
        }
        console.log();
      }

      if (result.generation.warnings.length) {
        console.log(chalk.yellow('Warnings:'));
        result.generation.warnings.forEach((w) => console.log(chalk.yellow(`  ⚠ ${w}`)));
      }
    },
  );
