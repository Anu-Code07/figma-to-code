# AI & UI Fidelity

## How AI works in Design2Code

Design2Code uses **two layers** — deterministic codegen plus optional LLM enhancement.

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

This layer does **not** use any LLM. It runs locally.

---

## LLM routing by usage mode

### MCP (Cursor / Claude Desktop) — uses **host LLM**

When you use Design2Code via MCP, **no API key is required**.

| What happens | Detail |
|--------------|--------|
| Compiler runs locally | Figma → AST → codegen |
| AI enhancement | Routed to **Cursor/Claude host LLM** via MCP sampling (`server.createMessage`) |
| API key | **Not needed** — the host model handles optimization |

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

No `ANTHROPIC_API_KEY` in MCP env — the host provides the LLM.

### CLI / local — uses **your API key**

When you run `design2code generate` locally, keys are resolved in this order:

1. `~/.design2code/config.json` (from `design2code login`)
2. Environment variables (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`)
3. Shell profile (`~/.zshrc`, `~/.bashrc`, `~/.profile`)
4. **Interactive prompt** (if running in a terminal and no key found)

```bash
# Save to config
design2code login --anthropic-key sk-ant-...

# Also append to ~/.zshrc
design2code login --anthropic-key sk-ant-... --save-to-zshrc

# Or add manually to ~/.zshrc
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
```

Disable AI entirely:

```bash
design2code generate --no-ai ...
```

---

## AI passes (when LLM is available)

| Pass | MCP (host) | CLI (API key) |
|------|------------|---------------|
| `AIEngine` rule-based | Always | Always |
| `AIEngine` LLM enhance | Host LLM | Claude / OpenAI |
| `UIFidelityEnhancer` | Host LLM | Claude / OpenAI |

Supported CLI providers: **Anthropic Claude**, **OpenAI**.

---

## Cursor / Claude role

| Mode | Cursor/Claude role |
|------|-------------------|
| **MCP** | Host LLM + orchestrator (invokes tools, provides sampling) |
| **CLI** | Not involved — you run the compiler directly |

Design2Code is the **compiler**. Cursor/Claude is the **host** when using MCP.

---

## Pixel-perfect UI

See fidelity engine details in the generators. Each output includes a fidelity score (0–100%).

### Maximizing fidelity

1. Use **auto-layout** in Figma
2. Name layers semantically
3. Provide **`design.md`** with design tokens
4. **MCP**: host LLM handles enhancement automatically
5. **CLI**: configure API key via login, `.zshrc`, or prompt
