# Architecture

## Pipeline

Design2Code AI follows a compiler-style pipeline. Raw Figma JSON is never emitted as code directly.

### Stage 1: Figma Parser (`@design2code/figma-parser`)

- Connects to Figma REST API
- Converts Figma node tree to framework-independent Design AST
- Preserves layout, style, text, constraints, and effects

### Stage 2: Design Token Engine (`@design2code/design-token-engine`)

- Extracts colors, typography, spacing, radius, shadows
- Merges with `design.md` token definitions
- Outputs framework-specific themes (Flutter ThemeData, Tailwind config, CSS variables)

### Stage 3: Component Detector (`@design2code/component-detector`)

- Pattern-matches UI semantics (buttons, cards, forms, navbars…)
- Assigns confidence scores and reusability flags
- Identifies screens and infers routes

### Stage 4: Design AST (`@design2code/design-ast`)

The intermediate representation — a typed, traversable tree independent of any framework.

### Stage 5: AI Optimization (`@design2code/ai-engine`)

Rule-based + optional Claude/OpenAI optimization:

- Reduce nesting
- Improve naming
- Extract duplicate components
- Improve accessibility
- Replace magic numbers with tokens

### Stage 6: Framework Generator (`@design2code/generator-*`)

Plugin-based code generation via the Generator SDK. Each generator implements `parse → transform → generate → postProcess`.

### Stage 7: Merge Engine (`@design2code/merge-engine`)

For existing projects:

- Detect framework and architecture
- Match naming conventions and folder structure
- Apply create / merge / replace / preview strategies

## Extensibility

| Extension Point | How to Add |
|----------------|------------|
| New framework | Create `packages/generators/<name>/`, implement `Generator`, register in CLI |
| New component pattern | Add to `DETECTION_PATTERNS` in component-detector |
| New AI provider | Implement `AIProvider` interface in ai-engine |
| New token format | Add generator in design-token-engine |

## Integration Points

- **CLI** — `design2code` command for terminal workflows
- **MCP Server** — Native Claude Desktop and Cursor integration
- **VS Code Extension** — Planned (packages/vscode-extension)
- **Web Dashboard** — Planned (packages/dashboard)
