import type { Generator } from '@design2code/generator-sdk';
import type { Framework } from '@design2code/design-ast';

const registry = new Map<Framework, Generator>();

export function registerGenerator(framework: Framework, generator: Generator): void {
  registry.set(framework, generator);
}

export function getGenerator(framework: Framework): Generator {
  const generator = registry.get(framework);
  if (!generator) {
    throw new Error(
      `No generator registered for framework "${framework}". Available: ${listGenerators().join(', ')}`,
    );
  }
  return generator;
}

export function listGenerators(): Framework[] {
  return Array.from(registry.keys());
}

export function hasGenerator(framework: Framework): boolean {
  return registry.has(framework);
}
