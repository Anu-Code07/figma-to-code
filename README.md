# Design2Code AI

**AI Design Compiler** — transforms Figma designs into clean, production-ready code for multiple frontend frameworks.

This is not a simple Figma-to-code converter. It is a full design compiler with an intermediate Design AST, AI optimization layer, plugin-based framework generators, and intelligent merge support for existing projects.

## Architecture

```
Figma
  ↓
Figma Parser
  ↓
Design Token Extraction
  ↓
Component Detection
  ↓
Intermediate Design AST
  ↓
AI Optimization Layer
  ↓
Framework Generator (Plugin)
  ↓
Production Code
```

## Supported Frameworks (Phase 1)

| Framework | Status |
|-----------|--------|
| Flutter | ✅ Material 3, BLoC, GoRouter, Clean Architecture |
| React | ✅ TypeScript, Tailwind, CSS Modules, Feature-first |
| Next.js | ✅ App Router, Server Components, Server Actions |
| React Native | ✅ Expo, NativeWind, React Navigation |

## Generation Scopes

| Scope | Output |
|-------|--------|
| `component` | Reusable components only (Button, Card, Navbar…) |
| `screen` | Single page/screen with child components |
| `feature` | Full feature module (presentation, logic, services, tests) |
| `project` | Entire application scaffold |

## Quick Start

```bash
# Install from npm (after publish)
npm i -g @figma-to-code/cli

# Or run without installing
npx @figma-to-code/cli login --figma-token <your-token>
```

### Development (monorepo)

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Login with Figma
pnpm exec design2code login --figma-token <your-token>

# Import a Figma file
pnpm exec design2code import --file <figma-file-key>

# Generate React components
pnpm exec design2code generate --framework react --scope component

# Generate with design system
pnpm exec design2code generate --framework flutter --scope feature --design-system design.md

# Preview without writing files
pnpm exec design2code generate --framework nextjs --scope screen --preview

# Merge into existing project
pnpm exec design2code generate --framework react --scope component --merge --project ./
```

## design.md — Design System Configuration

Place a `design.md` in your project root to tell the compiler about your design system:

```md
# Design System: My App

## Framework
- framework: react
- architecture: feature-first
- state: zustand
- ui: tailwind

## Colors
- primary: #6366F1

## Typography
- heading-lg: Inter 32px 700

## Components
- Button: src/components/Button
```

See [examples/design.md](examples/design.md) for a complete example.

## Claude / Cursor Integration (MCP)

Design2Code AI includes an MCP server for direct use in Claude Desktop and Cursor:

```json
{
  "mcpServers": {
    "design2code": {
      "command": "npx",
      "args": ["@figma-to-code/mcp-server"]
    }
  }
}
```

No AI API key is needed in MCP config — Cursor/Claude provides the host LLM.

### Figma authentication (MCP)

Use the `design2code_login_figma` tool with a [Figma personal access token](https://www.figma.com/developers/api#access-tokens), or set `FIGMA_TOKEN` in MCP env. Tokens are saved to `~/.design2code/config.json` (shared with the CLI).

```bash
# CLI alternative
design2code login --figma-token <your-token>
```

### MCP Tools

- `design2code_login_figma` — Authenticate with Figma (personal access token)
- `design2code_figma_status` — Check Figma auth status
- `design2code_generate` — Generate code from Design AST or Figma
- `design2code_import_figma` — Import Figma file to Design AST
- `design2code_parse_design_md` — Parse design.md configuration
- `design2code_detect_project` — Detect existing project framework/architecture
- `design2code_preview` — Preview generated code

## CLI Commands

| Command | Description |
|---------|-------------|
| `design2code login` | Authenticate with Figma and AI providers |
| `design2code import` | Import Figma file to Design AST |
| `design2code sync` | Sync Figma and regenerate |
| `design2code preview` | Preview generated code |
| `design2code tokens` | Extract and export design tokens |
| `design2code watch` | Watch for changes and regenerate |
| `design2code generate` | Generate production code |

## Monorepo Structure

```
packages/
├── compiler-core/        # Main compiler orchestration
├── design-ast/           # Intermediate Design AST types
├── design-token-engine/  # Token extraction & transformation
├── component-detector/   # UI component pattern detection
├── figma-parser/         # Figma REST API → Design AST
├── ai-engine/            # AI optimization layer
├── merge-engine/         # Existing project merge & diff
├── generator-sdk/        # Plugin SDK for generators
├── generators/
│   ├── flutter/
│   ├── react/
│   ├── nextjs/
│   └── react-native/
├── cli/                  # Command-line interface
└── mcp-server/           # Claude/Cursor MCP integration
```

## Plugin Architecture

Every framework generator implements the `Generator` interface:

```typescript
interface Generator {
  parse(context: GeneratorContext): Promise<GeneratorContext>;
  transform(context: GeneratorContext): Promise<GeneratorContext>;
  generate(context: GeneratorContext): Promise<GenerationResult>;
  postProcess(result: GenerationResult, context: GeneratorContext): Promise<GenerationResult>;
}
```

Adding a new framework requires only a new generator package — no core changes.

## Existing Project Support

The merge engine:

- Detects project type (Flutter, React, Next.js, React Native)
- Understands folder structure, themes, and naming conventions
- Supports create, merge, replace, and preview diff modes
- Never blindly overwrites files

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
```

## License

MIT
