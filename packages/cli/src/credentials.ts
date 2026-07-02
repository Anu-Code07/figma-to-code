import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import chalk from 'chalk';
import { loadConfig, saveConfig, type Design2CodeConfig } from './config.js';

export interface ResolvedAiCredentials {
  provider: 'claude' | 'openai' | 'local';
  apiKey?: string;
  source?: 'config' | 'env' | 'shell' | 'prompt';
}

const SHELL_FILES = ['.zshrc', '.bashrc', '.profile', '.zprofile'];

function parseExportValue(line: string, key: string): string | undefined {
  const match = line.match(new RegExp(`^\\s*export\\s+${key}=["']?([^"'\\s#]+)["']?`));
  return match?.[1];
}

/** Read ANTHROPIC_API_KEY / OPENAI_API_KEY from shell profile files (~/.zshrc, etc.) */
export async function readShellApiKeys(): Promise<{
  anthropicApiKey?: string;
  openaiApiKey?: string;
}> {
  const keys: { anthropicApiKey?: string; openaiApiKey?: string } = {};

  for (const file of SHELL_FILES) {
    try {
      const content = await readFile(join(homedir(), file), 'utf-8');
      for (const line of content.split('\n')) {
        keys.anthropicApiKey ??= parseExportValue(line, 'ANTHROPIC_API_KEY');
        keys.openaiApiKey ??= parseExportValue(line, 'OPENAI_API_KEY');
      }
    } catch {
      // profile file may not exist
    }
  }

  return keys;
}

async function promptForApiKey(label: string): Promise<string | undefined> {
  if (!input.isTTY) return undefined;

  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(
      chalk.yellow(`${label} API key not found. Enter key (or press Enter to skip AI): `),
    );
    const trimmed = answer.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  } finally {
    rl.close();
  }
}

/**
 * Resolve AI credentials for CLI / local usage.
 * Order: config.json → env vars → ~/.zshrc (etc.) → interactive prompt
 */
export async function resolveAiCredentials(options?: {
  interactive?: boolean;
  noAi?: boolean;
}): Promise<ResolvedAiCredentials> {
  if (options?.noAi) {
    return { provider: 'local' };
  }

  const config = await loadConfig();

  if (config.anthropicApiKey) {
    return { provider: 'claude', apiKey: config.anthropicApiKey, source: 'config' };
  }
  if (config.openaiApiKey) {
    return { provider: 'openai', apiKey: config.openaiApiKey, source: 'config' };
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return { provider: 'claude', apiKey: process.env.ANTHROPIC_API_KEY, source: 'env' };
  }
  if (process.env.OPENAI_API_KEY) {
    return { provider: 'openai', apiKey: process.env.OPENAI_API_KEY, source: 'env' };
  }

  const shellKeys = await readShellApiKeys();
  if (shellKeys.anthropicApiKey) {
    return { provider: 'claude', apiKey: shellKeys.anthropicApiKey, source: 'shell' };
  }
  if (shellKeys.openaiApiKey) {
    return { provider: 'openai', apiKey: shellKeys.openaiApiKey, source: 'shell' };
  }

  if (options?.interactive !== false && input.isTTY) {
    console.log(
      chalk.dim(
        'Tip: add export ANTHROPIC_API_KEY=... to ~/.zshrc or run design2code login --anthropic-key ...',
      ),
    );

    const anthropicKey = await promptForApiKey('Anthropic');
    if (anthropicKey) {
      await persistApiKey(config, 'anthropic', anthropicKey);
      return { provider: 'claude', apiKey: anthropicKey, source: 'prompt' };
    }

    const openaiKey = await promptForApiKey('OpenAI');
    if (openaiKey) {
      await persistApiKey(config, 'openai', openaiKey);
      return { provider: 'openai', apiKey: openaiKey, source: 'prompt' };
    }
  }

  return { provider: 'local' };
}

async function persistApiKey(
  config: Design2CodeConfig,
  provider: 'anthropic' | 'openai',
  apiKey: string,
): Promise<void> {
  if (provider === 'anthropic') config.anthropicApiKey = apiKey;
  else config.openaiApiKey = apiKey;
  await saveConfig(config);
  console.log(chalk.green('✓ API key saved to ~/.design2code/config.json'));
}
