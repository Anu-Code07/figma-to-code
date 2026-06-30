import type { AIProvider, AICompletionOptions } from './optimizer.js';

/** Anthropic Claude provider for AI optimization */
export class ClaudeProvider implements AIProvider {
  name = 'claude';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'claude-sonnet-4-20250514') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async complete(prompt: string, options: AICompletionOptions = {}): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.3,
        system: options.systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };
    return data.content.find((c) => c.type === 'text')?.text ?? '';
  }
}

/** OpenAI-compatible provider */
export class OpenAIProvider implements AIProvider {
  name = 'openai';
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(apiKey: string, model = 'gpt-4o', baseUrl = 'https://api.openai.com/v1') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl;
  }

  async complete(prompt: string, options: AICompletionOptions = {}): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.3,
        messages: [
          ...(options.systemPrompt
            ? [{ role: 'system' as const, content: options.systemPrompt }]
            : []),
          { role: 'user' as const, content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0]?.message.content ?? '';
  }
}

/** Rule-based fallback when no AI API is configured */
export class LocalProvider implements AIProvider {
  name = 'local';

  async complete(_prompt: string): Promise<string> {
    return JSON.stringify({ suggestions: ['Using rule-based optimization'], componentNames: {} });
  }
}

export function createProvider(
  type: 'claude' | 'openai' | 'local',
  apiKey?: string,
): AIProvider {
  switch (type) {
    case 'claude':
      if (!apiKey) throw new Error('Claude API key required');
      return new ClaudeProvider(apiKey);
    case 'openai':
      if (!apiKey) throw new Error('OpenAI API key required');
      return new OpenAIProvider(apiKey);
    default:
      return new LocalProvider();
  }
}
