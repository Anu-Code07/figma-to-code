import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

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
