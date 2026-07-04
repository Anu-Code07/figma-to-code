import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Framework, ArchitecturePattern, StateManagement, UILibrary } from '@figma-to-code/design-ast';

export interface ProjectProfile {
  framework: Framework;
  root: string;
  language: 'typescript' | 'javascript' | 'dart';
  architecture?: ArchitecturePattern;
  stateManagement?: StateManagement;
  uiLibrary?: UILibrary;
  routing?: string;
  paths: ProjectPaths;
  conventions: NamingConventions;
  configFiles: string[];
}

export interface ProjectPaths {
  components: string;
  screens: string;
  features: string;
  tokens: string;
  assets: string;
  tests: string;
  src: string;
}

export interface NamingConventions {
  components: 'PascalCase' | 'kebab-case';
  files: 'PascalCase' | 'kebab-case';
  folders: 'PascalCase' | 'kebab-case';
}

export class ProjectDetector {
  async detect(projectRoot: string): Promise<ProjectProfile | null> {
    if (existsSync(join(projectRoot, 'pubspec.yaml'))) {
      return this.detectFlutter(projectRoot);
    }
    if (existsSync(join(projectRoot, 'next.config.js')) || existsSync(join(projectRoot, 'next.config.ts')) || existsSync(join(projectRoot, 'next.config.mjs'))) {
      return this.detectNextjs(projectRoot);
    }
    if (existsSync(join(projectRoot, 'app.json')) || existsSync(join(projectRoot, 'metro.config.js'))) {
      return this.detectReactNative(projectRoot);
    }
    if (existsSync(join(projectRoot, 'package.json'))) {
      const pkg = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf-8')) as {
        dependencies?: Record<string, string>;
      };
      if (pkg.dependencies?.react) {
        return this.detectReact(projectRoot, pkg.dependencies);
      }
    }
    return null;
  }

  private detectFlutter(root: string): ProjectProfile {
    return {
      framework: 'flutter',
      root,
      language: 'dart',
      architecture: existsSync(join(root, 'lib/features')) ? 'feature-first' : 'flat',
      stateManagement: this.detectFlutterState(root),
      uiLibrary: 'material3',
      routing: existsSync(join(root, 'pubspec.yaml')) ? 'go-router' : undefined,
      paths: {
        src: 'lib',
        components: 'lib/shared/widgets',
        screens: 'lib/features',
        features: 'lib/features',
        tokens: 'lib/core/theme',
        assets: 'assets',
        tests: 'test',
      },
      conventions: { components: 'PascalCase', files: 'kebab-case', folders: 'kebab-case' },
      configFiles: ['pubspec.yaml', 'analysis_options.yaml'],
    };
  }

  private detectFlutterState(root: string): StateManagement {
    const pubspec = existsSync(join(root, 'pubspec.yaml'));
    if (!pubspec) return 'none';
    return 'bloc';
  }

  private detectReact(root: string, deps: Record<string, string>): ProjectProfile {
    const hasVite = existsSync(join(root, 'vite.config.ts')) || existsSync(join(root, 'vite.config.js'));
    return {
      framework: 'react',
      root,
      language: existsSync(join(root, 'tsconfig.json')) ? 'typescript' : 'javascript',
      architecture: existsSync(join(root, 'src/features')) ? 'feature-first' : 'flat',
      stateManagement: deps['@reduxjs/toolkit'] ? 'redux-toolkit' : deps.zustand ? 'zustand' : 'none',
      uiLibrary: deps['@mui/material'] ? 'mui' : deps['@radix-ui/react-slot'] ? 'shadcn' : 'tailwind',
      routing: deps['react-router-dom'] ? 'react-router' : undefined,
      paths: {
        src: 'src',
        components: 'src/components',
        screens: 'src/pages',
        features: 'src/features',
        tokens: 'src/styles',
        assets: 'src/assets',
        tests: 'src/__tests__',
      },
      conventions: { components: 'PascalCase', files: 'PascalCase', folders: 'kebab-case' },
      configFiles: hasVite ? ['vite.config.ts', 'package.json'] : ['package.json'],
    };
  }

  private detectNextjs(root: string): ProjectProfile {
    return {
      framework: 'nextjs',
      root,
      language: existsSync(join(root, 'tsconfig.json')) ? 'typescript' : 'javascript',
      architecture: 'feature-first',
      uiLibrary: 'tailwind',
      routing: 'app-router',
      paths: {
        src: 'src',
        components: 'src/components',
        screens: 'src/app',
        features: 'src/features',
        tokens: 'src/styles',
        assets: 'public',
        tests: 'src/__tests__',
      },
      conventions: { components: 'PascalCase', files: 'kebab-case', folders: 'kebab-case' },
      configFiles: ['next.config.ts', 'package.json'],
    };
  }

  private detectReactNative(root: string): ProjectProfile {
    const isExpo = existsSync(join(root, 'app.json'));
    return {
      framework: 'react-native',
      root,
      language: existsSync(join(root, 'tsconfig.json')) ? 'typescript' : 'javascript',
      architecture: 'feature-first',
      uiLibrary: existsSync(join(root, 'tailwind.config.js')) ? 'nativewind' : 'none',
      routing: '@react-navigation/native',
      paths: {
        src: 'src',
        components: 'src/components',
        screens: 'src/screens',
        features: 'src/features',
        tokens: 'src/theme',
        assets: 'assets',
        tests: '__tests__',
      },
      conventions: { components: 'PascalCase', files: 'PascalCase', folders: 'kebab-case' },
      configFiles: isExpo ? ['app.json', 'package.json'] : ['package.json'],
    };
  }
}

export async function detectProject(projectRoot: string): Promise<ProjectProfile | null> {
  return new ProjectDetector().detect(projectRoot);
}
