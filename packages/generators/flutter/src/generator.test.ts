import { describe, it, expect } from 'vitest';
import { createDesignNode, DesignASTBuilder } from '@design2code/design-ast';
import { FlutterGenerator } from './generator.js';

describe('FlutterGenerator', () => {
  const generator = new FlutterGenerator();

  function buildContext(scope: 'component' | 'feature' | 'screen' | 'project') {
    const root = createDesignNode({
      id: 'root',
      type: 'frame',
      name: 'Auth Feature',
      layout: { mode: 'vertical' },
      style: {},
      children: [
        createDesignNode({
          id: 'btn-1',
          type: 'component',
          name: 'Login Button',
          semanticType: 'button',
          layout: { mode: 'none' },
          style: { backgroundColor: { hex: '#6366F1' } },
          text: { content: 'Sign In' },
          children: [],
        }),
      ],
    });

    const document = new DesignASTBuilder()
      .setName('Auth')
      .setRoot(root)
      .build();

    document.components = [
      {
        id: 'comp-btn',
        type: 'button',
        name: 'Login Button',
        nodeId: 'btn-1',
        confidence: 0.9,
        reusable: true,
      },
    ];
    document.screens = [
      { id: 'screen-1', name: 'Login Screen', nodeId: 'root', route: '/login' },
    ];

    return {
      options: {
        framework: 'flutter' as const,
        scope,
        includeTests: true,
      },
      document,
      project: null,
    };
  }

  it('generates component with clean widget structure', async () => {
    const result = await generator.generate(buildContext('component'));
    const widget = result.files.find((f) => f.path.includes('shared/widgets/login_button.dart'));
    expect(widget).toBeDefined();
    expect(widget!.content).toContain('class LoginButton extends StatelessWidget');
    expect(widget!.content).toContain('Color(0xFF6366F1)');
    expect(widget!.content).toContain('Semantics');
  });

  it('generates full clean architecture feature module', async () => {
    const result = await generator.generate(buildContext('feature'));
    const paths = result.files.map((f) => f.path);

    expect(paths).toContain('lib/core/error/failures.dart');
    expect(paths).toContain('lib/core/usecases/usecase.dart');
    expect(paths.some((p) => p.includes('domain/entities/auth_entity.dart'))).toBe(true);
    expect(paths.some((p) => p.includes('domain/repositories/auth_repository.dart'))).toBe(true);
    expect(paths.some((p) => p.includes('domain/usecases/get_auth_usecase.dart'))).toBe(true);
    expect(paths.some((p) => p.includes('data/models/auth_model.dart'))).toBe(true);
    expect(paths.some((p) => p.includes('data/datasources/auth_remote_datasource.dart'))).toBe(true);
    expect(paths.some((p) => p.includes('data/repositories/auth_repository_impl.dart'))).toBe(true);
    expect(paths.some((p) => p.includes('presentation/bloc/auth_bloc.dart'))).toBe(true);
    expect(paths.some((p) => p.includes('presentation/bloc/auth_event.dart'))).toBe(true);
    expect(paths.some((p) => p.includes('presentation/bloc/auth_state.dart'))).toBe(true);
    expect(paths.some((p) => p.includes('presentation/pages/auth_page.dart'))).toBe(true);
  });

  it('generates sealed BLoC states and events', async () => {
    const result = await generator.generate(buildContext('feature'));
    const stateFile = result.files.find((f) => f.path.endsWith('auth_state.dart'));
    expect(stateFile!.content).toContain('sealed class AuthState');
    expect(stateFile!.content).toContain('final class AuthLoading');
    expect(stateFile!.content).toContain('final class AuthError');

    const blocFile = result.files.find((f) => f.path.endsWith('auth_bloc.dart'));
    expect(blocFile!.content).toContain('GetAuthUseCase');
    expect(blocFile!.content).toContain('switch (result)');
  });

  it('generates theme token files', async () => {
    const result = await generator.generate(buildContext('component'));
    expect(result.files.some((f) => f.path === 'lib/core/theme/app_colors.dart')).toBe(true);
    expect(result.files.some((f) => f.path === 'lib/core/theme/app_spacing.dart')).toBe(true);
    expect(result.files.some((f) => f.path === 'lib/core/theme/app_theme.dart')).toBe(true);
  });
});
