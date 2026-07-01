# AI & UI Fidelity

## How AI works in Design2Code

Design2Code uses **two layers** — deterministic codegen plus optional AI enhancement.

```
Figma → Parser → Design AST → [AI Layer] → Generator → Pixel-perfect UI code
```

### Layer 1: Deterministic (always runs, no API key)

| Step | What it does |
|------|----------------|
| Figma Parser | Extracts exact dimensions, padding, colors, typography, shadows, auto-layout |
| FigmaFidelityEngine | Computes pixel-perfect styles per node |
| Framework Emitter | Generates Flutter / Next.js / React Native with inline exact values |
| Rule-based optimizer | Naming, nesting, accessibility, token replacement |

This layer does **not** use Claude or Cursor. It runs locally.

### Layer 2: Optional AI (Claude or OpenAI API key)

When you configure an API key:

```bash
design2code login --anthropic-key sk-ant-...
# or
design2code login --openai-key sk-...
```

| AI Pass | Purpose |
|---------|---------|
| `AIEngine` | Improve naming, reduce nesting, extract duplicates, accessibility |
| `UIFidelityEnhancer` | Fix missing gaps, padding, layout issues for pixel-perfect output |

AI calls go to **Anthropic Claude** or **OpenAI** directly — not through Cursor's built-in AI.

## Cursor / Claude integration (MCP)

Cursor and Claude Desktop do **not** embed AI inside the compiler. They connect via **MCP (Model Context Protocol)**:

```json
{
  "mcpServers": {
    "design2code": {
      "command": "npx",
      "args": ["@design2code/mcp-server"],
      "env": { "ANTHROPIC_API_KEY": "your-key" }
    }
  }
}
```

**What happens:**
1. You ask Cursor/Claude: *"Generate this Figma design as Flutter"*
2. Cursor invokes the `design2code_generate` MCP tool
3. The MCP server runs the compiler pipeline locally
4. If `ANTHROPIC_API_KEY` is set, the AI fidelity layer runs
5. Generated code is returned to Cursor for you to review/apply

Cursor/Claude is the **host/orchestrator**. Design2Code is the **compiler**.

## Pixel-perfect UI (100% Figma fidelity goal)

The `FigmaFidelityEngine` extracts from every node:

- Exact width/height from bounding box
- Per-edge padding (top, right, bottom, left)
- Auto-layout gap, flex direction, alignment
- Per-corner border radius
- Shadows (offset, blur, spread, color)
- Typography (font, size, weight, line height, letter spacing)
- Opacity, borders, background fills

Each framework emitter applies these as:

| Framework | Output |
|-----------|--------|
| Flutter | `EdgeInsets.fromLTRB`, `BoxDecoration`, exact `TextStyle` |
| Next.js | Inline `style={{ }}` with exact pixel values |
| React Native | Per-node `StyleSheet` entries from Figma properties |

### Fidelity score

Each generated component includes a fidelity score (0–100%) in metadata. Scores below 70% trigger a warning suggesting AI enhancement.

### Maximizing fidelity

1. Use **auto-layout** in Figma (not absolute positioning)
2. Name layers semantically (`Button`, `Card`, not `Frame 427`)
3. Provide a **`design.md`** with your design system tokens
4. Enable AI: `design2code login --anthropic-key ...`
5. Use `--no-ai` only when you want pure deterministic output
