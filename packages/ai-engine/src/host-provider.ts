import type { AIProvider, AICompletionOptions } from './optimizer.js';

export type HostCompleteFn = (prompt: string, options?: AICompletionOptions) => Promise<string>;

/**
 * Uses the MCP host LLM (Cursor / Claude Desktop) via sampling — no separate API key.
 * Falls back to rule-based-only when no host callback is wired.
 */
export class HostProvider implements AIProvider {
  readonly name = 'host';

  constructor(private readonly completeFn?: HostCompleteFn) {}

  get usesHostLlm(): boolean {
    return Boolean(this.completeFn);
  }

  async complete(prompt: string, options: AICompletionOptions = {}): Promise<string> {
    if (!this.completeFn) {
      return JSON.stringify({
        suggestions: ['Host LLM unavailable — using rule-based optimization only'],
        componentNames: {},
      });
    }
    return this.completeFn(prompt, options);
  }
}

export function createHostProvider(completeFn?: HostCompleteFn): HostProvider {
  return new HostProvider(completeFn);
}
