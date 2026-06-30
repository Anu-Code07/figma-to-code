# design.md Format

The `design.md` file tells Design2Code AI about your project's design system, architecture, and conventions. Place it in your project root or pass it via `--design-system`.

## Full Example

```md
# Design System: My App

## Framework
- framework: react
- architecture: feature-first
- state: zustand
- ui: tailwind
- routing: react-router

## Colors
- primary: #6366F1
- secondary: #8B5CF6

## Typography
- heading-lg: Inter 32px 700
- body-md: Inter 16px 400

## Spacing
- sm: 8
- md: 16

## Radius
- sm: 4
- lg: 12

## Components
- Button: src/components/Button
- Card: src/components/Card

## Naming
- components: PascalCase
- files: PascalCase
- folders: kebab-case

## Folders
- components: src/components
- screens: src/pages
- features: src/features

## Rules
- Always use design tokens instead of hardcoded colors
- Prefer composition over deep nesting
```

## Sections

| Section | Purpose |
|---------|---------|
| Framework | Target framework, architecture, state management, UI library |
| Colors | Named color tokens (hex values) |
| Typography | Font family, size, weight per token name |
| Spacing | Numeric spacing scale |
| Radius | Border radius values |
| Components | Existing component paths for merge/reuse |
| Naming | File and folder naming conventions |
| Folders | Custom folder structure paths |
| Rules | Free-text rules passed to AI optimization |

## Framework Values

- `framework`: flutter, react, nextjs, react-native
- `architecture`: clean-architecture, feature-first, atomic-design, flat
- `state`: bloc, riverpod, redux-toolkit, zustand, tanstack-query
- `ui`: material3, cupertino, mui, shadcn, tailwind, css-modules, nativewind
