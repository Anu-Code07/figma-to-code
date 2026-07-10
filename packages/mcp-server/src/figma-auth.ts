import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createFigmaClient } from '@figma-to-code/figma-parser';

const CONFIG_DIR = join(homedir(), '.design2code');
export const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

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

/** Resolve Figma token: tool arg → FIGMA_TOKEN env → ~/.design2code/config.json */
export async function resolveFigmaToken(explicit?: string): Promise<string> {
  if (explicit) return explicit;
  if (process.env.FIGMA_TOKEN) return process.env.FIGMA_TOKEN;

  const config = await loadConfig();
  if (config.figmaToken) return config.figmaToken;

  throw new Error(
    'Figma not authenticated. Run design2code_login_figma with your personal access token, set FIGMA_TOKEN in MCP env, or run: design2code login --figma-token <token>',
  );
}

export async function loginFigma(token: string): Promise<{
  authenticated: boolean;
  handle?: string;
  email?: string;
  configPath: string;
  verified: boolean;
}> {
  const config = await loadConfig();
  config.figmaToken = token;
  await saveConfig(config);

  let verified = false;
  let handle: string | undefined;
  let email: string | undefined;

  try {
    const me = await createFigmaClient(token).getMe();
    verified = true;
    handle = me.handle;
    email = me.email;
  } catch {
    verified = false;
  }

  return {
    authenticated: true,
    handle,
    email,
    configPath: CONFIG_FILE,
    verified,
  };
}

export async function getFigmaAuthStatus(): Promise<{
  authenticated: boolean;
  source?: 'env' | 'config';
  handle?: string;
  email?: string;
  verified: boolean;
}> {
  const envToken = process.env.FIGMA_TOKEN;
  const config = await loadConfig();
  const token = envToken ?? config.figmaToken;

  if (!token) {
    return { authenticated: false, verified: false };
  }

  try {
    const me = await createFigmaClient(token).getMe();
    return {
      authenticated: true,
      source: envToken ? 'env' : 'config',
      handle: me.handle,
      email: me.email,
      verified: true,
    };
  } catch {
    return {
      authenticated: true,
      source: envToken ? 'env' : 'config',
      verified: false,
    };
  }
}
