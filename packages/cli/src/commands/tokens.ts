import { Command } from 'commander';
import chalk from 'chalk';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import {
  extractTokens,
  generateFlutterTheme,
  generateTailwindConfig,
  generateCSSVariables,
  generateReactNativeTheme,
  mergeWithDesignSystem,
} from '@figma-to-code/design-token-engine';
import { parseDesignMd } from '@figma-to-code/compiler-core';
import type { DesignDocument, Framework } from '@figma-to-code/design-ast';

export const tokensCommand = new Command('tokens')
  .description('Extract and export design tokens')
  .option('--ast <path>', 'Path to design-ast.json', '.design2code/design-ast.json')
  .option('--design-system <path>', 'Path to design.md')
  .option('--framework <fw>', 'Output format', 'react')
  .option('--output <dir>', 'Output directory', './tokens')
  .action(
    async (options: {
      ast: string;
      designSystem?: string;
      framework: string;
      output: string;
    }) => {
      const astPath = join(process.cwd(), options.ast);
      if (!existsSync(astPath)) {
        console.error(chalk.red(`Design AST not found: ${astPath}`));
        process.exit(1);
      }

      const document = JSON.parse(await readFile(astPath, 'utf-8')) as DesignDocument;
      let tokens = extractTokens(document);

      if (options.designSystem) {
        const config = await parseDesignMd(options.designSystem);
        tokens = mergeWithDesignSystem(tokens, config);
      }

      const framework = options.framework as Framework;
      let output;
      switch (framework) {
        case 'flutter':
          output = generateFlutterTheme(tokens);
          break;
        case 'react-native':
          output = generateReactNativeTheme(tokens);
          break;
        case 'nextjs':
        case 'react':
          output = options.framework === 'react' ? generateTailwindConfig(tokens) : generateCSSVariables(tokens);
          break;
        default:
          output = generateCSSVariables(tokens);
      }

      const outputPath = join(process.cwd(), options.output, output.path);
      await mkdir(join(outputPath, '..'), { recursive: true });
      await writeFile(outputPath, output.content);

      console.log(chalk.green(`✓ Exported ${tokens.colors.length} colors, ${tokens.spacing.length} spacing tokens`));
      console.log(chalk.dim(`Saved to ${outputPath}`));
    },
  );
