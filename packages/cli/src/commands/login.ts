import { Command } from 'commander';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import chalk from 'chalk';
import { createFigmaClient } from '@design2code/figma-parser';

const CONFIG_DIR = join(homedir(), '.design2code');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export interface Design2CodeConfig {
  figmaToken?: string;
  anthropicApiKey?: string;
  openaiApiKey?: string;
  defaultFramework?: string;
}

export async function loadConfig(): Promise<Design2CodeConfig> {
  try {
    const content = await readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(content) as Design2CodeConfig;
  } catch {
    return {};
  }
}

export async function saveConfig(config: Design2CodeConfig): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export const loginCommand = new Command('login')
  .description('Authenticate with Figma and AI providers')
  .option('--figma-token <token>', 'Figma personal access token')
  .option('--anthropic-key <key>', 'Anthropic API key for Claude')
  .option('--openai-key <key>', 'OpenAI API key')
  .action(async (options: { figmaToken?: string; anthropicKey?: string; openaiKey?: string }) => {
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

    await saveConfig(config);
    console.log(chalk.green(`✓ Configuration saved to ${CONFIG_FILE}`));
  });
