import { Command } from 'commander';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { createFigmaClient } from '@design2code/figma-parser';
import { parseFigmaFile } from '@design2code/figma-parser';
import { loadConfig } from './login.js';

export const importCommand = new Command('import')
  .description('Import a Figma file and save Design AST')
  .requiredOption('--file <key>', 'Figma file key or URL')
  .option('--output <dir>', 'Output directory', '.design2code')
  .option('--nodes <ids>', 'Comma-separated node IDs to import')
  .action(async (options: { file: string; output: string; nodes?: string }) => {
    const config = await loadConfig();
    if (!config.figmaToken) {
      console.error(chalk.red('Not authenticated. Run: design2code login --figma-token <token>'));
      process.exit(1);
    }

    const fileKey = extractFileKey(options.file);
    const nodeIds = options.nodes?.split(',').map((s) => s.trim());

    const spinner = ora('Importing Figma file...').start();
    try {
      const client = createFigmaClient(config.figmaToken);
      const figmaFile = await client.getFile(fileKey, nodeIds);
      const document = parseFigmaFile(figmaFile, { fileKey, nodeIds });

      const outputDir = join(process.cwd(), options.output);
      await mkdir(outputDir, { recursive: true });
      await writeFile(join(outputDir, 'design-ast.json'), JSON.stringify(document, null, 2));
      await writeFile(join(outputDir, 'figma-raw.json'), JSON.stringify(figmaFile, null, 2));

      spinner.succeed(
        chalk.green(
          `Imported "${document.name}" — ${document.metadata.componentCount} components, ${document.metadata.frameCount} frames`,
        ),
      );
      console.log(chalk.dim(`Saved to ${outputDir}/design-ast.json`));
    } catch (error) {
      spinner.fail(chalk.red(`Import failed: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

function extractFileKey(input: string): string {
  const match = input.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
  return match ? match[1] : input;
}
