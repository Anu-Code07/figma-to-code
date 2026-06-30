import type { ComponentType } from '@design2code/design-ast';

export interface DetectionPattern {
  type: ComponentType;
  namePatterns: RegExp[];
  minChildren?: number;
  maxChildren?: number;
  requiresText?: boolean;
  minWidth?: number;
  minHeight?: number;
  layoutMode?: string[];
  confidence: number;
}

export const DETECTION_PATTERNS: DetectionPattern[] = [
  {
    type: 'button',
    namePatterns: [/button/i, /btn/i, /cta/i, /submit/i, /primary-action/i],
    requiresText: true,
    minHeight: 32,
    confidence: 0.9,
  },
  {
    type: 'text-field',
    namePatterns: [/input/i, /text-?field/i, /textbox/i, /search/i, /email/i, /password/i],
    minHeight: 36,
    confidence: 0.85,
  },
  {
    type: 'search-bar',
    namePatterns: [/search-?bar/i, /search-?input/i, /search/i],
    minWidth: 200,
    confidence: 0.88,
  },
  {
    type: 'card',
    namePatterns: [/card/i, /tile/i, /panel/i],
    minWidth: 100,
    minHeight: 80,
    confidence: 0.8,
  },
  {
    type: 'navbar',
    namePatterns: [/nav(bar)?/i, /header/i, /top-?bar/i, /app-?bar/i],
    layoutMode: ['horizontal'],
    confidence: 0.85,
  },
  {
    type: 'footer',
    namePatterns: [/footer/i, /bottom-?bar/i],
    confidence: 0.85,
  },
  {
    type: 'pricing-card',
    namePatterns: [/pricing/i, /plan/i, /subscription/i],
    confidence: 0.82,
  },
  {
    type: 'product-card',
    namePatterns: [/product/i, /item-?card/i],
    confidence: 0.82,
  },
  {
    type: 'dialog',
    namePatterns: [/dialog/i, /modal/i, /popup/i, /alert/i],
    confidence: 0.87,
  },
  {
    type: 'bottom-sheet',
    namePatterns: [/bottom-?sheet/i, /drawer/i, /sheet/i],
    confidence: 0.86,
  },
  {
    type: 'fab',
    namePatterns: [/fab/i, /floating/i],
    minWidth: 48,
    minHeight: 48,
    confidence: 0.9,
  },
  {
    type: 'hero-section',
    namePatterns: [/hero/i, /banner/i, /jumbotron/i],
    minHeight: 200,
    confidence: 0.8,
  },
  {
    type: 'auth-form',
    namePatterns: [/login/i, /sign-?in/i, /sign-?up/i, /register/i, /auth/i],
    confidence: 0.88,
  },
  {
    type: 'dashboard',
    namePatterns: [/dashboard/i, /overview/i, /analytics/i],
    confidence: 0.75,
  },
  {
    type: 'list',
    namePatterns: [/list/i, /items/i, /rows/i],
    minChildren: 2,
    layoutMode: ['vertical'],
    confidence: 0.78,
  },
  {
    type: 'navigation',
    namePatterns: [/nav/i, /menu/i, /sidebar/i, /tab-?bar/i],
    confidence: 0.8,
  },
  {
    type: 'form',
    namePatterns: [/form/i],
    minChildren: 2,
    confidence: 0.75,
  },
  {
    type: 'chart',
    namePatterns: [/chart/i, /graph/i, /analytics/i],
    confidence: 0.7,
  },
];
