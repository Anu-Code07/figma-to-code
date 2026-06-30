# Design System: Flutter App

## Framework
- framework: flutter
- architecture: clean-architecture
- state: bloc
- ui: material3
- routing: go-router

## Colors
- primary: #6366F1
- secondary: #8B5CF6
- background: #FFFFFF
- surface: #F5F5F5
- onPrimary: #FFFFFF
- onSurface: #1A1A1A
- error: #B00020

## Typography
- displayLarge: Roboto 57px 400
- headlineMedium: Roboto 28px 500
- titleLarge: Roboto 22px 500
- bodyLarge: Roboto 16px 400
- bodyMedium: Roboto 14px 400
- labelLarge: Roboto 14px 500

## Spacing
- xs: 4
- sm: 8
- md: 16
- lg: 24
- xl: 32

## Radius
- sm: 4
- md: 8
- lg: 16

## Components
- AppButton: lib/shared/widgets/app_button.dart
- AppCard: lib/shared/widgets/app_card.dart
- AppTextField: lib/shared/widgets/app_text_field.dart

## Folders
- components: lib/shared/widgets
- screens: lib/features
- features: lib/features
- tokens: lib/core/theme
- assets: assets
- tests: test

## Rules
- Follow Clean Architecture with feature-first folder structure
- Use BLoC for state management
- Material 3 theming with ThemeData and ColorScheme
- Never use magic numbers — reference AppTokens
