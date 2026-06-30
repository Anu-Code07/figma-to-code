export interface DesignTokenSet {
  colors: ColorToken[];
  typography: TypographyToken[];
  spacing: SpacingToken[];
  radius: RadiusToken[];
  shadows: ShadowToken[];
  borders: BorderToken[];
  elevation: ElevationToken[];
  opacity: OpacityToken[];
  icons: IconToken[];
  images: ImageToken[];
}

export interface ColorToken {
  name: string;
  value: string;
  category?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'semantic' | 'background' | 'surface' | 'text' | 'border' | 'other';
  darkValue?: string;
  description?: string;
}

export interface TypographyToken {
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number | string;
  lineHeight: number;
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  description?: string;
}

export interface SpacingToken {
  name: string;
  value: number;
  description?: string;
}

export interface RadiusToken {
  name: string;
  value: number;
  description?: string;
}

export interface ShadowToken {
  name: string;
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
  description?: string;
}

export interface BorderToken {
  name: string;
  width: number;
  style: 'solid' | 'dashed' | 'dotted' | 'none';
  color: string;
  description?: string;
}

export interface ElevationToken {
  name: string;
  value: number;
  description?: string;
}

export interface OpacityToken {
  name: string;
  value: number;
  description?: string;
}

export interface IconToken {
  name: string;
  source: string;
  format: 'svg' | 'png' | 'font';
  description?: string;
}

export interface ImageToken {
  name: string;
  source: string;
  format: 'png' | 'jpg' | 'svg' | 'webp';
  description?: string;
}

export function createEmptyTokenSet(): DesignTokenSet {
  return {
    colors: [],
    typography: [],
    spacing: [],
    radius: [],
    shadows: [],
    borders: [],
    elevation: [],
    opacity: [],
    icons: [],
    images: [],
  };
}
