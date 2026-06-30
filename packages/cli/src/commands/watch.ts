import { Command } from 'commander';
import chalk from 'chalk';
import { watch } from 'node:fs';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export const watchCommand = new Command('watch')
  .description('Watch Figma file or design-ast for changes and regenerate')
  .option('--ast <path>', 'Path to design-ast.json', '.design2code/design-ast.json')
  .option('--file <key>', 'Figma file key for live sync')
  .option('--framework <fw>', 'Target framework', 'react')
  .option('--scope <scope>', 'Generation scope', 'component')
  .option('--output <dir>', 'Output directory', './generated')
  .action(async (options: { ast: string; file?: string; framework: string; scope: string; output: string }) => {
    const astPath = join(process.cwd(), options.ast);

    console.log(chalk.bold('Watching for changes...'));
    console.log(chalk.dim('Press Ctrl+C to stop\n'));

    const regenerate = async () => {
      console.log(chalk.blue('⟳ Regenerating...'));
      try {
        if (options.file) {
          await execAsync(
            `design2code sync --file ${options.file} --framework ${options.framework} --scope ${options.scope} --output ${options.output}`,
          );
        } else if (existsSync(astPath)) {
          await execAsync(
            `design2code preview --ast ${options.ast} --framework ${options.framework} --scope ${options.scope}`,
          );
        }
        console.log(chalk.green('✓ Regenerated\n'));
      } catch (error) {
        console.log(chalk.red(`✗ Regeneration failed: ${error instanceof Error ? error.message : error}\n`));
      }
    };

    if (existsSync(astPath)) {
      watch(astPath, regenerate);
      console.log(chalk.dim(`Watching ${astPath}`));
    }

    if (options.file) {
      const interval = setInterval(regenerate, 60_000);
      console.log(chalk.dim(`Polling Figma file every 60s`));
      process.on('SIGINT', () => {
        clearInterval(interval);
        process.exit(0);
      });
    }
  });
