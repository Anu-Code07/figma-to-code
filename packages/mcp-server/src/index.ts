#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { createCompiler, parseDesignMd, registerGenerator } from '@figma-to-code/compiler-core';
import { createMcpHostComplete } from './host-llm.js';
import { getFigmaAuthStatus, loginFigma, resolveFigmaToken } from './figma-auth.js';
import { createFigmaClient, parseFigmaFile } from '@figma-to-code/figma-parser';
import { detectProject } from '@figma-to-code/merge-engine';
import { FlutterGenerator } from '@figma-to-code/generator-flutter';
import { ReactGenerator } from '@figma-to-code/generator-react';
import { NextjsGenerator } from '@figma-to-code/generator-nextjs';
import { ReactNativeGenerator } from '@figma-to-code/generator-react-native';
import type { DesignDocument, Framework, GenerationScope } from '@figma-to-code/design-ast';

registerGenerator('flutter', new FlutterGenerator());
registerGenerator('react', new ReactGenerator());
registerGenerator('nextjs', new NextjsGenerator());
registerGenerator('react-native', new ReactNativeGenerator());

const server = new Server(
  { name: 'design2code', version: '0.1.3' },
  {
    capabilities: { tools: {}, resources: {} },
    instructions:
      'Design2Code compiles Figma designs into production code. AI uses the host LLM (Cursor/Claude) — no AI API key needed. For Figma, call design2code_login_figma with a personal access token from figma.com/developers, or set FIGMA_TOKEN in MCP env.',
  },
);

const GenerateSchema = z.object({
  framework: z.enum(['flutter', 'react', 'nextjs', 'react-native']),
  scope: z.enum(['component', 'screen', 'feature', 'project']),
  astPath: z.string().optional(),
  figmaFileKey: z.string().optional(),
  figmaToken: z.string().optional(),
  designSystemPath: z.string().optional(),
  projectRoot: z.string().optional(),
  mergeStrategy: z.enum(['create', 'merge', 'replace', 'preview']).optional(),
  selection: z.array(z.string()).optional(),
  includeTests: z.boolean().optional(),
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'design2code_generate',
      description:
        'Generate production-ready code from a Figma design or Design AST. Supports Flutter, React, Next.js, and React Native at component, screen, feature, or project scope.',
      inputSchema: {
        type: 'object',
        properties: {
          framework: { type: 'string', enum: ['flutter', 'react', 'nextjs', 'react-native'] },
          scope: { type: 'string', enum: ['component', 'screen', 'feature', 'project'] },
          astPath: { type: 'string', description: 'Path to design-ast.json' },
          figmaFileKey: { type: 'string', description: 'Figma file key' },
          figmaToken: {
            type: 'string',
            description: 'Figma access token (optional if logged in via design2code_login_figma)',
          },
          designSystemPath: { type: 'string', description: 'Path to design.md' },
          projectRoot: { type: 'string', description: 'Existing project root for merge' },
          mergeStrategy: { type: 'string', enum: ['create', 'merge', 'replace', 'preview'] },
          selection: { type: 'array', items: { type: 'string' } },
          includeTests: { type: 'boolean' },
        },
        required: ['framework', 'scope'],
      },
    },
    {
      name: 'design2code_import_figma',
      description: 'Import a Figma file and create a Design AST',
      inputSchema: {
        type: 'object',
        properties: {
          fileKey: { type: 'string' },
          token: {
            type: 'string',
            description: 'Figma access token (optional if logged in via design2code_login_figma)',
          },
          outputPath: { type: 'string' },
        },
        required: ['fileKey'],
      },
    },
    {
      name: 'design2code_login_figma',
      description:
        'Authenticate with Figma using a personal access token. Saves to ~/.design2code/config.json (shared with CLI). Get a token at figma.com → Settings → Security → Personal access tokens.',
      inputSchema: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'Figma personal access token' },
        },
        required: ['token'],
      },
    },
    {
      name: 'design2code_figma_status',
      description: 'Check whether Figma is authenticated and which account is connected',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'design2code_parse_design_md',
      description: 'Parse a design.md file describing the design system',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string' },
        },
        required: ['path'],
      },
    },
    {
      name: 'design2code_detect_project',
      description: 'Detect framework and architecture of an existing project',
      inputSchema: {
        type: 'object',
        properties: {
          projectRoot: { type: 'string' },
        },
        required: ['projectRoot'],
      },
    },
    {
      name: 'design2code_preview',
      description: 'Preview generated code without writing files',
      inputSchema: {
        type: 'object',
        properties: {
          framework: { type: 'string', enum: ['flutter', 'react', 'nextjs', 'react-native'] },
          scope: { type: 'string', enum: ['component', 'screen', 'feature', 'project'] },
          astPath: { type: 'string' },
          designSystemPath: { type: 'string' },
        },
        required: ['framework', 'scope', 'astPath'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'design2code_generate':
        return await handleGenerate(args);
      case 'design2code_import_figma':
        return await handleImport(args as { fileKey: string; token?: string; outputPath?: string });
      case 'design2code_login_figma':
        return await handleLoginFigma(args as { token: string });
      case 'design2code_figma_status':
        return await handleFigmaStatus();
      case 'design2code_parse_design_md':
        return await handleParseDesignMd(args as { path: string });
      case 'design2code_detect_project':
        return await handleDetectProject(args as { projectRoot: string });
      case 'design2code_preview':
        return await handlePreview(args);
      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : error}` }],
      isError: true,
    };
  }
});

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: 'design2code://docs/architecture',
      name: 'Design2Code Architecture',
      description: 'Compiler pipeline architecture documentation',
      mimeType: 'text/markdown',
    },
    {
      uri: 'design2code://docs/design-md',
      name: 'design.md Format',
      description: 'How to write a design.md design system file',
      mimeType: 'text/markdown',
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  if (uri === 'design2code://docs/architecture') {
    return {
      contents: [
        {
          uri,
          mimeType: 'text/markdown',
          text: ARCHITECTURE_DOC,
        },
      ],
    };
  }
  if (uri === 'design2code://docs/design-md') {
    return {
      contents: [
        {
          uri,
          mimeType: 'text/markdown',
          text: DESIGN_MD_DOC,
        },
      ],
    };
  }
  throw new Error(`Unknown resource: ${uri}`);
});

async function handleGenerate(args: unknown) {
  const params = GenerateSchema.parse(args);
  const document = await loadDocument(params);
  const compiler = createCompiler();
  const hostComplete = createMcpHostComplete(server);

  const result = await compiler.compile(document, {
    framework: params.framework as Framework,
    scope: params.scope as GenerationScope,
    designSystemPath: params.designSystemPath,
    projectRoot: params.projectRoot,
    mergeStrategy: params.mergeStrategy ?? 'preview',
    selection: params.selection,
    includeTests: params.includeTests,
    aiEnabled: true,
    aiProvider: 'host',
    hostComplete,
    dryRun: params.mergeStrategy === 'preview',
  });

  const summary = {
    filesGenerated: result.generation.files.length,
    framework: params.framework,
    scope: params.scope,
    aiMode: 'host-llm',
    warnings: result.generation.warnings,
    files: result.generation.files.map((f) => ({
      path: f.path,
      language: f.language,
      kind: f.kind,
      preview: f.content.split('\n').slice(0, 30).join('\n'),
    })),
    merge: result.merge
      ? {
          created: result.merge.created,
          updated: result.merge.updated,
          skipped: result.merge.skipped,
        }
      : undefined,
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
  };
}

async function handleLoginFigma(args: { token: string }) {
  const result = await loginFigma(args.token);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            ...result,
            message: result.verified
              ? `Authenticated as ${result.handle} (${result.email})`
              : 'Token saved but verification failed — check the token is valid',
          },
          null,
          2,
        ),
      },
    ],
  };
}

async function handleFigmaStatus() {
  const status = await getFigmaAuthStatus();
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            ...status,
            message: status.authenticated
              ? status.verified
                ? `Connected as ${status.handle} (${status.email}) via ${status.source}`
                : 'Token found but verification failed'
              : 'Not authenticated — run design2code_login_figma',
          },
          null,
          2,
        ),
      },
    ],
  };
}

async function handleImport(args: { fileKey: string; token?: string; outputPath?: string }) {
  const client = createFigmaClient(await resolveFigmaToken(args.token));
  const figmaFile = await client.getFile(args.fileKey);
  const document = parseFigmaFile(figmaFile, { fileKey: args.fileKey });

  const outputPath = args.outputPath ?? '.design2code/design-ast.json';
  await mkdir(join(outputPath, '..'), { recursive: true });
  await writeFile(outputPath, JSON.stringify(document, null, 2));

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            name: document.name,
            components: document.components.length,
            screens: document.screens.length,
            outputPath,
          },
          null,
          2,
        ),
      },
    ],
  };
}

async function handleParseDesignMd(args: { path: string }) {
  const config = await parseDesignMd(args.path);
  return {
    content: [{ type: 'text', text: JSON.stringify(config, null, 2) }],
  };
}

async function handleDetectProject(args: { projectRoot: string }) {
  const profile = await detectProject(args.projectRoot);
  return {
    content: [
      {
        type: 'text',
        text: profile ? JSON.stringify(profile, null, 2) : 'No supported project detected',
      },
    ],
  };
}

async function handlePreview(args: unknown) {
  const params = GenerateSchema.parse({ ...(args as object), mergeStrategy: 'preview' });
  return handleGenerate(params);
}

async function loadDocument(params: z.infer<typeof GenerateSchema>): Promise<DesignDocument> {
  if (params.figmaFileKey) {
    const client = createFigmaClient(await resolveFigmaToken(params.figmaToken));
    const figmaFile = await client.getFile(params.figmaFileKey);
    return parseFigmaFile(figmaFile, { fileKey: params.figmaFileKey });
  }

  const astPath = params.astPath ?? '.design2code/design-ast.json';
  if (!existsSync(astPath)) {
    throw new Error(`Design AST not found: ${astPath}. Import a Figma file first.`);
  }
  return JSON.parse(await readFile(astPath, 'utf-8')) as DesignDocument;
}

const ARCHITECTURE_DOC = `# Design2Code AI Architecture

Figma → Figma Parser → Design Token Extraction → Component Detection → Design AST → AI Optimization → Framework Generator → Production Code

## Generation Scopes
- component: Reusable UI components only
- screen: Single page/screen with routing
- feature: Full feature module (presentation, logic, services)
- project: Entire application scaffold

## Supported Frameworks
Flutter, React, Next.js (App Router), React Native
`;

const DESIGN_MD_DOC = `# design.md Format

\`\`\`md
# Design System: My App

## Framework
- framework: flutter
- architecture: clean-architecture
- state: bloc
- ui: material3

## Colors
- primary: #6366F1
- secondary: #8B5CF6

## Typography
- heading-lg: Inter 32px 700
- body-md: Inter 16px 400

## Spacing
- sm: 8
- md: 16

## Components
- Button: lib/shared/widgets/button.dart
\`\`\`
`;

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Design2Code MCP server running');
}

main().catch(console.error);
