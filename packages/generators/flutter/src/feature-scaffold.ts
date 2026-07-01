import type { GeneratedFile } from '@design2code/design-ast';
import type { GeneratorContext } from '@design2code/generator-sdk';
import { toPascalCase, toSnakeCase } from './naming.js';

export interface FeatureDesignContent {
  widgetClassName: string;
  /** Relative import path under presentation/widgets/ (without .dart) */
  widgetImportPath: string;
}

export function generateCoreLayer(): GeneratedFile[] {
  return [
    file(
      'lib/core/error/failures.dart',
      `import 'package:equatable/equatable.dart';

/// Base failure for domain layer error handling
sealed class Failure extends Equatable {
  const Failure(this.message);

  final String message;

  @override
  List<Object?> get props => [message];
}

final class ServerFailure extends Failure {
  const ServerFailure([super.message = 'Server error occurred']);
}

final class CacheFailure extends Failure {
  const CacheFailure([super.message = 'Cache error occurred']);
}

final class NetworkFailure extends Failure {
  const NetworkFailure([super.message = 'No internet connection']);
}

final class ValidationFailure extends Failure {
  const ValidationFailure(super.message);
}
`,
    ),
    file(
      'lib/core/error/exceptions.dart',
      `/// Data-layer exceptions mapped to [Failure] in repositories
class ServerException implements Exception {
  const ServerException([this.message = 'Server error']);
  final String message;
}

class CacheException implements Exception {
  const CacheException([this.message = 'Cache error']);
  final String message;
}
`,
    ),
    file(
      'lib/core/usecases/usecase.dart',
      `import '../error/failures.dart';
import '../utils/result.dart';

/// Base use case — all business logic lives here, never in widgets or BLoC
abstract class UseCase<Type, Params> {
  Future<Result<Type>> call(Params params);
}

class NoParams {
  const NoParams();
}
`,
    ),
    file(
      'lib/core/utils/result.dart',
      `import '../error/failures.dart';

/// Lightweight Result type (avoids external Either dependency)
sealed class Result<T> {
  const Result();
}

final class Success<T> extends Result<T> {
  const Success(this.value);
  final T value;
}

final class Error<T> extends Result<T> {
  const Error(this.failure);
  final Failure failure;
}
`,
    ),
  ];
}

export function generateFeatureModule(
  context: GeneratorContext,
  createFile: (path: string, content: string, kind: GeneratedFile['kind']) => GeneratedFile,
  designContent?: FeatureDesignContent,
): GeneratedFile[] {
  const featureName = context.document.name;
  const pascal = toPascalCase(featureName);
  const snake = toSnakeCase(featureName);
  const entity = `${pascal}Entity`;
  const files: GeneratedFile[] = [];

  // ── Domain layer ──────────────────────────────────────────
  files.push(
    createFile(
      `lib/features/${snake}/domain/entities/${snake}_entity.dart`,
      `import 'package:equatable/equatable.dart';

/// Domain entity — pure business object, no framework dependencies
class ${entity} extends Equatable {
  const ${entity}({
    required this.id,
    required this.title,
  });

  final String id;
  final String title;

  @override
  List<Object?> get props => [id, title];
}
`,
      'feature',
    ),
  );

  files.push(
    createFile(
      `lib/features/${snake}/domain/repositories/${snake}_repository.dart`,
      `import '../../../../core/error/failures.dart';
import '../../../../core/utils/result.dart';
import '../entities/${snake}_entity.dart';

/// Repository contract — domain layer defines the interface
abstract class ${pascal}Repository {
  Future<Result<List<${entity}>>> getItems();
}
`,
      'feature',
    ),
  );

  files.push(
    createFile(
      `lib/features/${snake}/domain/usecases/get_${snake}_usecase.dart`,
      `import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../../../../core/utils/result.dart';
import '../entities/${snake}_entity.dart';
import '../repositories/${snake}_repository.dart';

/// Use case — single business action, testable in isolation
class Get${pascal}UseCase implements UseCase<List<${entity}>, NoParams> {
  const Get${pascal}UseCase(this._repository);

  final ${pascal}Repository _repository;

  @override
  Future<Result<List<${entity}>>> call(NoParams params) {
    return _repository.getItems();
  }
}
`,
      'feature',
    ),
  );

  // ── Data layer ────────────────────────────────────────────
  files.push(
    createFile(
      `lib/features/${snake}/data/models/${snake}_model.dart`,
      `import '../../domain/entities/${snake}_entity.dart';

/// Data model with JSON mapping — never leaks into presentation
class ${pascal}Model {
  const ${pascal}Model({required this.id, required this.title});

  final String id;
  final String title;

  factory ${pascal}Model.fromJson(Map<String, dynamic> json) {
    return ${pascal}Model(
      id: json['id'] as String,
      title: json['title'] as String,
    );
  }

  Map<String, dynamic> toJson() => {'id': id, 'title': title};

  ${entity} toEntity() => ${entity}(id: id, title: title);
}
`,
      'feature',
    ),
  );

  files.push(
    createFile(
      `lib/features/${snake}/data/datasources/${snake}_remote_datasource.dart`,
      `import '../models/${snake}_model.dart';

/// Remote data source — API / network calls only
abstract class ${pascal}RemoteDataSource {
  Future<List<${pascal}Model>> fetchItems();
}

class ${pascal}RemoteDataSourceImpl implements ${pascal}RemoteDataSource {
  const ${pascal}RemoteDataSourceImpl();

  @override
  Future<List<${pascal}Model>> fetchItems() async {
    // TODO: Replace with real API call
    await Future<void>.delayed(const Duration(milliseconds: 500));
    return const [
      ${pascal}Model(id: '1', title: '${pascal} Item 1'),
      ${pascal}Model(id: '2', title: '${pascal} Item 2'),
    ];
  }
}
`,
      'feature',
    ),
  );

  files.push(
    createFile(
      `lib/features/${snake}/data/repositories/${snake}_repository_impl.dart`,
      `import '../../../../core/error/exceptions.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/utils/result.dart';
import '../../domain/entities/${snake}_entity.dart';
import '../../domain/repositories/${snake}_repository.dart';
import '../datasources/${snake}_remote_datasource.dart';

/// Repository implementation — maps exceptions to failures
class ${pascal}RepositoryImpl implements ${pascal}Repository {
  const ${pascal}RepositoryImpl(this._remoteDataSource);

  final ${pascal}RemoteDataSource _remoteDataSource;

  @override
  Future<Result<List<${entity}>>> getItems() async {
    try {
      final models = await _remoteDataSource.fetchItems();
      return Success(models.map((m) => m.toEntity()).toList());
    } on ServerException catch (e) {
      return Error(ServerFailure(e.message));
    } catch (_) {
      return const Error(ServerFailure());
    }
  }
}
`,
      'feature',
    ),
  );

  // ── Presentation layer — BLoC (sealed states/events) ──────
  files.push(
    createFile(
      `lib/features/${snake}/presentation/bloc/${snake}_event.dart`,
      `import 'package:equatable/equatable.dart';

sealed class ${pascal}Event extends Equatable {
  const ${pascal}Event();

  @override
  List<Object?> get props => [];
}

final class ${pascal}Started extends ${pascal}Event {
  const ${pascal}Started();
}

final class ${pascal}Retried extends ${pascal}Event {
  const ${pascal}Retried();
}
`,
      'feature',
    ),
  );

  files.push(
    createFile(
      `lib/features/${snake}/presentation/bloc/${snake}_state.dart`,
      `import 'package:equatable/equatable.dart';
import '../../domain/entities/${snake}_entity.dart';

sealed class ${pascal}State extends Equatable {
  const ${pascal}State();

  @override
  List<Object?> get props => [];
}

final class ${pascal}Initial extends ${pascal}State {
  const ${pascal}Initial();
}

final class ${pascal}Loading extends ${pascal}State {
  const ${pascal}Loading();
}

final class ${pascal}Loaded extends ${pascal}State {
  const ${pascal}Loaded(this.items);

  final List<${entity}> items;

  @override
  List<Object?> get props => [items];
}

final class ${pascal}Empty extends ${pascal}State {
  const ${pascal}Empty();
}

final class ${pascal}Error extends ${pascal}State {
  const ${pascal}Error(this.message);

  final String message;

  @override
  List<Object?> get props => [message];
}
`,
      'feature',
    ),
  );

  files.push(
    createFile(
      `lib/features/${snake}/presentation/bloc/${snake}_bloc.dart`,
      `import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/usecases/usecase.dart';
import '../../../../core/utils/result.dart';
import '../../domain/usecases/get_${snake}_usecase.dart';
import '${snake}_event.dart';
import '${snake}_state.dart';

/// BLoC — thin orchestrator, delegates logic to use cases
class ${pascal}Bloc extends Bloc<${pascal}Event, ${pascal}State> {
  ${pascal}Bloc({required Get${pascal}UseCase get${pascal}UseCase})
      : _get${pascal}UseCase = get${pascal}UseCase,
        super(const ${pascal}Initial()) {
    on<${pascal}Started>(_onStarted);
    on<${pascal}Retried>(_onStarted);
  }

  final Get${pascal}UseCase _get${pascal}UseCase;

  Future<void> _onStarted(
    ${pascal}Event event,
    Emitter<${pascal}State> emit,
  ) async {
    emit(const ${pascal}Loading());

    final result = await _get${pascal}UseCase(const NoParams());

    switch (result) {
      case Success(value: final items) when items.isEmpty:
        emit(const ${pascal}Empty());
      case Success(value: final items):
        emit(${pascal}Loaded(items));
      case Error(failure: final failure):
        emit(${pascal}Error(failure.message));
    }
  }
}
`,
      'feature',
    ),
  );

  // ── Presentation widgets ──────────────────────────────────
  files.push(
    createFile(
      `lib/features/${snake}/presentation/widgets/${snake}_loading_view.dart`,
      `import 'package:flutter/material.dart';

class ${pascal}LoadingView extends StatelessWidget {
  const ${pascal}LoadingView({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(child: CircularProgressIndicator());
  }
}
`,
      'feature',
    ),
  );

  files.push(
    createFile(
      `lib/features/${snake}/presentation/widgets/${snake}_error_view.dart`,
      `import 'package:flutter/material.dart';
import '../../../../core/theme/app_spacing.dart';

class ${pascal}ErrorView extends StatelessWidget {
  const ${pascal}ErrorView({
    super.key,
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: AppSpacing.md),
            ElevatedButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}
`,
      'feature',
    ),
  );

  files.push(
    createFile(
      `lib/features/${snake}/presentation/widgets/${snake}_body.dart`,
      designContent
        ? `import 'package:flutter/material.dart';
import '${designContent.widgetImportPath}.dart';

/// Figma design content — compound widget tree from design AST
class ${pascal}Body extends StatelessWidget {
  const ${pascal}Body({super.key});

  @override
  Widget build(BuildContext context) {
    return const ${designContent.widgetClassName}();
  }
}
`
        : `import 'package:flutter/material.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../domain/entities/${snake}_entity.dart';

class ${pascal}Body extends StatelessWidget {
  const ${pascal}Body({super.key, required this.items});

  final List<${entity}> items;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.md),
      itemCount: items.length,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
      itemBuilder: (context, index) {
        final item = items[index];
        return ListTile(
          title: Text(item.title),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
            side: BorderSide(color: Theme.of(context).dividerColor),
          ),
        );
      },
    );
  }
}
`,
      'feature',
    ),
  );

  files.push(
    createFile(
      `lib/features/${snake}/presentation/pages/${snake}_page.dart`,
      `import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/datasources/${snake}_remote_datasource.dart';
import '../../data/repositories/${snake}_repository_impl.dart';
import '../../domain/usecases/get_${snake}_usecase.dart';
import '../bloc/${snake}_bloc.dart';
import '../bloc/${snake}_event.dart';
import '../bloc/${snake}_state.dart';
import '../widgets/${snake}_body.dart';
import '../widgets/${snake}_error_view.dart';
import '../widgets/${snake}_loading_view.dart';

/// Page — dumb UI, all logic in BLoC
class ${pascal}Page extends StatelessWidget {
  const ${pascal}Page({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => ${pascal}Bloc(
        get${pascal}UseCase: Get${pascal}UseCase(
          ${pascal}RepositoryImpl(const ${pascal}RemoteDataSourceImpl()),
        ),
      )..add(const ${pascal}Started()),
      child: const _${pascal}View(),
    );
  }
}

class _${pascal}View extends StatelessWidget {
  const _${pascal}View();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('${pascal}')),
      body: BlocBuilder<${pascal}Bloc, ${pascal}State>(
        builder: (context, state) {
          return switch (state) {
            ${pascal}Initial() || ${pascal}Loading() => const ${pascal}LoadingView(),
            ${pascal}Loaded(items: final items) => ${designContent ? `const ${pascal}Body()` : `${pascal}Body(items: items)`},
            ${pascal}Empty() => const Center(child: Text('No items found')),
            ${pascal}Error(message: final msg) => ${pascal}ErrorView(
              message: msg,
              onRetry: () => context.read<${pascal}Bloc>().add(const ${pascal}Retried()),
            ),
          };
        },
      ),
    );
  }
}
`,
      'feature',
    ),
  );

  // ── Tests ─────────────────────────────────────────────────
  if (context.options.includeTests !== false) {
    files.push(
      createFile(
        `test/features/${snake}/${snake}_bloc_test.dart`,
        `import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';

// TODO: Import generated feature files after adding to test pubspec
// import 'package:design2code_app/features/${snake}/presentation/bloc/${snake}_bloc.dart';

void main() {
  group('${pascal}Bloc', () {
    test('placeholder — wire up bloc_test after project generation', () {
      expect(true, isTrue);
    });
  });
}
`,
        'test',
      ),
    );

    files.push(
      createFile(
        `test/features/${snake}/${snake}_page_test.dart`,
        `import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('${pascal}Page shows loading initially', (tester) async {
    // TODO: Pump ${pascal}Page with mocked dependencies
    expect(true, isTrue);
  });
}
`,
        'test',
      ),
    );
  }

  return files;
}

function file(path: string, content: string): GeneratedFile {
  return { path, content, language: 'dart', kind: 'project', action: 'create' };
}
