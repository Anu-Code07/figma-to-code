import { Command } from 'commander';
import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import chalk from 'chalk';
import { createFigmaClient } from '@design2code/figma-parser';
import { loadConfig, saveConfig, CONFIG_FILE } from '../config.js';
import { readShellApiKeys } from '../credentials.js';

export { loadConfig, saveConfig, CONFIG_FILE, type Design2CodeConfig } from '../config.js';

export const loginCommand = new Command('login')
  .description('Authenticate with Figma and AI providers')
  .option('--figma-token <token>', 'Figma personal access token')
  .option('--anthropic-key <key>', 'Anthropic API key for Claude')
  .option('--openai-key <key>', 'OpenAI API key')
  .option('--save-to-zshrc', 'Also append API key export to ~/.zshrc')
  .action(async (options: {
    figmaToken?: string;
    anthropicKey?: string;
    openaiKey?: string;
    saveToZshrc?: boolean;
  }) => {
    const config = await loadConfig();

    if (options.figmaToken) {
      config.figmaToken = options.figmaToken;
      const client = createFigmaClient(options.figmaToken);
      try {
        const me = await client.getMe();
        console.log(chalk.green(`✓ Figma authenticated as ${me.handle} (${me.email})`));
      } catch {
        console.log(chalk.yellow('⚠ Figma token saved but verification failed'));
      }
    }

    if (options.anthropicKey) config.anthropicApiKey = options.anthropicKey;
    if (options.openaiKey) config.openaiApiKey = options.openaiKey;

    if (options.saveToZshrc) {
      if (options.anthropicKey) {
        await appendFile(join(homedir(), '.zshrc'), `\nexport ANTHROPIC_API_KEY="${options.anthropicKey}"\n`);
        console.log(chalk.green('✓ Anthropic key appended to ~/.zshrc'));
      }
      if (options.openaiKey) {
        await appendFile(join(homedir(), '.zshrc'), `\nexport OPENAI_API_KEY="${options.openaiKey}"\n`);
        console.log(chalk.green('✓ OpenAI key appended to ~/.zshrc'));
      }
    }

    await saveConfig(config);
    console.log(chalk.green(`✓ Configuration saved to ${CONFIG_FILE}`));
    console.log(
      chalk.dim(
        'CLI also reads keys from env vars and ~/.zshrc. MCP mode uses Cursor/Claude host LLM — no API key needed.',
      ),
    );
  });

export async function loadConfigFromShell(): Promise<import('../config.js').Design2CodeConfig> {
  const config = await loadConfig();
  const shell = await readShellApiKeys();
  return {
    ...config,
    anthropicApiKey: config.anthropicApiKey ?? shell.anthropicApiKey,
    openaiApiKey: config.openaiApiKey ?? shell.openaiApiKey,
  };
}
