# Design System: Acme App

## Framework
- framework: react
- architecture: feature-first
- state: zustand
- ui: tailwind
- routing: react-router

## Colors
- primary: #6366F1
- secondary: #8B5CF6
- accent: #EC4899
- background: #FFFFFF
- surface: #F9FAFB
- text-primary: #111827
- text-secondary: #6B7280
- border: #E5E7EB
- error: #EF4444
- success: #10B981

## Typography
- heading-xl: Inter 36px 700
- heading-lg: Inter 28px 600
- heading-md: Inter 22px 600
- body-lg: Inter 18px 400
- body-md: Inter 16px 400
- body-sm: Inter 14px 400
- caption: Inter 12px 400

## Spacing
- xs: 4
- sm: 8
- md: 16
- lg: 24
- xl: 32
- 2xl: 48

## Radius
- sm: 4
- md: 8
- lg: 12
- xl: 16
- full: 9999

## Components
- Button: src/components/Button
- Card: src/components/Card
- TextField: src/components/TextField
- Navbar: src/components/Navbar

## Naming
- components: PascalCase
- files: PascalCase
- folders: kebab-case

## Folders
- components: src/components
- screens: src/pages
- features: src/features
- tokens: src/styles
- assets: src/assets
- tests: src/__tests__

## Rules
- Always use design tokens instead of hardcoded colors
- Prefer composition over deep nesting
- Generate accessible components with ARIA labels
- Use semantic HTML elements where possible
