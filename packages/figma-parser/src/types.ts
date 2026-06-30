/** Figma REST API response types (subset) */
export interface FigmaFileResponse {
  name: string;
  lastModified: string;
  version: string;
  document: FigmaNode;
  components?: Record<string, FigmaComponentMeta>;
  styles?: Record<string, FigmaStyleMeta>;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: FigmaNodeType;
  visible?: boolean;
  children?: FigmaNode[];
  absoluteBoundingBox?: FigmaBoundingBox;
  constraints?: FigmaConstraints;
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL' | 'GRID';
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  fills?: FigmaFill[];
  strokes?: FigmaStroke[];
  strokeWeight?: number;
  cornerRadius?: number;
  rectangleCornerRadii?: [number, number, number, number];
  effects?: FigmaEffect[];
  opacity?: number;
  characters?: string;
  style?: FigmaTextStyle;
  componentId?: string;
}

export type FigmaNodeType =
  | 'DOCUMENT'
  | 'CANVAS'
  | 'FRAME'
  | 'GROUP'
  | 'COMPONENT'
  | 'COMPONENT_SET'
  | 'INSTANCE'
  | 'TEXT'
  | 'RECTANGLE'
  | 'ELLIPSE'
  | 'VECTOR'
  | 'BOOLEAN_OPERATION'
  | 'STAR'
  | 'LINE'
  | 'REGULAR_POLYGON';

export interface FigmaBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FigmaConstraints {
  horizontal: string;
  vertical: string;
}

export interface FigmaFill {
  type: string;
  visible?: boolean;
  color?: { r: number; g: number; b: number; a: number };
  imageRef?: string;
}

export interface FigmaStroke {
  type: string;
  color?: { r: number; g: number; b: number; a: number };
}

export interface FigmaEffect {
  type: string;
  visible?: boolean;
  offset?: { x: number; y: number };
  radius?: number;
  spread?: number;
  color?: { r: number; g: number; b: number; a: number };
}

export interface FigmaTextStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeightPx?: number;
  letterSpacing?: number;
  textAlignHorizontal?: string;
  textDecoration?: string;
}

export interface FigmaComponentMeta {
  key: string;
  name: string;
  description?: string;
}

export interface FigmaStyleMeta {
  key: string;
  name: string;
  styleType: string;
  description?: string;
}

export interface FigmaImagesResponse {
  images: Record<string, string | null>;
  err?: string;
}
