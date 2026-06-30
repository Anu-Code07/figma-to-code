import { describe, it, expect } from 'vitest';
import { DETECTION_PATTERNS } from './patterns.js';

describe('DETECTION_PATTERNS', () => {
  it('includes button pattern', () => {
    const button = DETECTION_PATTERNS.find((p) => p.type === 'button');
    expect(button).toBeDefined();
    expect(button!.namePatterns.some((r) => r.test('Primary Button'))).toBe(true);
  });

  it('includes auth form pattern', () => {
    const auth = DETECTION_PATTERNS.find((p) => p.type === 'auth-form');
    expect(auth).toBeDefined();
    expect(auth!.namePatterns.some((r) => r.test('Login Screen'))).toBe(true);
  });
});
