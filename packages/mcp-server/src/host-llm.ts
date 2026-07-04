import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { CreateMessageResult } from '@modelcontextprotocol/sdk/types.js';
import type { AICompletionOptions, HostCompleteFn } from '@figma-to-code/ai-engine';

function extractSamplingText(result: CreateMessageResult): string {
  const { content } = result;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
  }
  if (content && typeof content === 'object' && 'type' in content && content.type === 'text') {
    return content.text;
  }
  return '';
}

/** Route AI calls to the MCP host LLM (Cursor / Claude Desktop) via sampling */
export function createMcpHostComplete(server: Server): HostCompleteFn {
  return async (prompt: string, options: AICompletionOptions = {}) => {
    const result = await server.createMessage({
      messages: [
        {
          role: 'user',
          content: { type: 'text', text: prompt },
        },
      ],
      maxTokens: options.maxTokens ?? 4096,
      systemPrompt: options.systemPrompt,
    });

    return extractSamplingText(result);
  };
}
