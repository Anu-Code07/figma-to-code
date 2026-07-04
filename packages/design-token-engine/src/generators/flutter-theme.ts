import type { DesignTokenSet } from '@figma-to-code/design-ast';

export interface TokenOutput {
  path: string;
  content: string;
  language: string;
}

const DEFAULT_COLORS: Record<string, string> = {
  primary: '6366F1',
  secondary: '8B5CF6',
  background: 'FFFFFF',
  surface: 'F9FAFB',
  onPrimary: 'FFFFFF',
  onSurface: '111827',
  error: 'EF4444',
};

const DEFAULT_SPACING: Record<string, number> = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
const DEFAULT_RADIUS: Record<string, number> = { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 };

export function generateFlutterThemeFiles(tokens: DesignTokenSet): TokenOutput[] {
  const colors = mergeColors(tokens);
  const spacing = mergeSpacing(tokens);
  const radius = mergeRadius(tokens);

  const colorLines = Object.entries(colors)
    .map(([name, hex]) => `  static const Color ${name} = Color(0xFF${hex});`)
    .join('\n');

  const spacingLines = Object.entries(spacing)
    .map(([name, value]) => `  static const double ${name} = ${value};`)
    .join('\n');

  const radiusLines = Object.entries(radius)
    .map(([name, value]) => `  static const double ${name} = ${value};`)
    .join('\n');

  const typoLines =
    tokens.typography.length > 0
      ? tokens.typography
          .map(
            (t) =>
              `  static const TextStyle ${toCamelCase(t.name)} = TextStyle(
    fontFamily: '${t.fontFamily}',
    fontSize: ${t.fontSize},
    fontWeight: FontWeight.w${normalizeWeight(t.fontWeight)},
    height: ${(t.lineHeight / t.fontSize).toFixed(2)},
    letterSpacing: ${t.letterSpacing ?? 0},
  );`,
          )
          .join('\n\n')
      : `  static const TextStyle bodyMedium = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w400,
    height: 1.5,
  );

  static const TextStyle titleLarge = TextStyle(
    fontSize: 22,
    fontWeight: FontWeight.w600,
    height: 1.3,
  );

  static const TextStyle labelLarge = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    height: 1.4,
  );`;

  return [
    {
      path: 'lib/core/theme/app_colors.dart',
      language: 'dart',
      content: `import 'package:flutter/material.dart';

/// Design system color tokens
abstract final class AppColors {
  AppColors._();

${colorLines}
}
`,
    },
    {
      path: 'lib/core/theme/app_spacing.dart',
      language: 'dart',
      content: `/// Design system spacing tokens
abstract final class AppSpacing {
  AppSpacing._();

${spacingLines}
}
`,
    },
    {
      path: 'lib/core/theme/app_radius.dart',
      language: 'dart',
      content: `/// Design system radius tokens
abstract final class AppRadius {
  AppRadius._();

${radiusLines}
}
`,
    },
    {
      path: 'lib/core/theme/app_typography.dart',
      language: 'dart',
      content: `import 'package:flutter/material.dart';

/// Design system typography tokens
abstract final class AppTypography {
  AppTypography._();

${typoLines}
}
`,
    },
    {
      path: 'lib/core/theme/app_theme.dart',
      language: 'dart',
      content: `import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Material 3 theme configuration
abstract final class AppTheme {
  AppTheme._();

  static ThemeData get light {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      brightness: Brightness.light,
      surface: AppColors.surface,
      error: AppColors.error,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.background,
      appBarTheme: const AppBarTheme(
        centerTitle: true,
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size(64, 48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        filled: true,
      ),
    );
  }

  static ThemeData get dark {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        brightness: Brightness.dark,
      ),
    );
  }
}
`,
    },
  ];
}

function mergeColors(tokens: DesignTokenSet): Record<string, string> {
  const result = { ...DEFAULT_COLORS };
  for (const c of tokens.colors) {
    result[toCamelCase(c.name.replace(/^color-/, ''))] = c.value.replace('#', '');
  }
  return result;
}

function mergeSpacing(tokens: DesignTokenSet): Record<string, number> {
  const result = { ...DEFAULT_SPACING };
  for (const s of tokens.spacing) {
    result[toCamelCase(s.name.replace(/^spacing-/, ''))] = s.value;
  }
  return result;
}

function mergeRadius(tokens: DesignTokenSet): Record<string, number> {
  const result = { ...DEFAULT_RADIUS };
  for (const r of tokens.radius) {
    result[toCamelCase(r.name.replace(/^radius-/, ''))] = r.value;
  }
  return result;
}

function normalizeWeight(weight: number | string): number {
  if (typeof weight === 'number') return weight;
  const map: Record<string, number> = { normal: 400, bold: 700, medium: 500, semibold: 600 };
  return map[weight.toLowerCase()] ?? 400;
}

function toCamelCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^./, (c) => c.toLowerCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}
