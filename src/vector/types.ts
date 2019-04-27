
/**
 * Only SVG is supported right now.
 */
export enum VectorType {
   SVG = "svg",
   PDF = "pdf",
   EPS = "eps",
   AI = "ai"
}

/**
 * Svg element type that consider reusable
 */
export enum SvgElementType {
   SVG = "svg",
   FILTER = "filter",
   MASK = "mask",
   CLIP_PATH = "clippath",
   GROUP = "g",
   DEFS = "defs",
   // graphical geomery
   TEXT = "text",
   RECT = "rect",
   CIRCLE = "circle",
   POLYGON = "polygon",
   POLYLINE = "polyline",
   LINE = "line",
   PATH = "path",
   ELLIPSE = "ellipse"
}

/**
 * Vector element type
 */
export type VectorElementType = SvgElementType