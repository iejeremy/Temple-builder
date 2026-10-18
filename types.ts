export type TempleMaterial =
  | "marble"
  | "sandstone"
  | "obsidian"
  | "limestone"
  | "gold"
  | "bronze";

export type TemplePieceType =
  | "wall"
  | "door"
  | "floor"
  | "tower"
  | "window"
  | "arch"
  | "column"
  | "roof";

export interface TemplePiece {
  id: string;
  type: TemplePieceType;
  variant: string;
  material: TempleMaterial;
  x: number;
  y: number;
  width: number;
  height: number;
  wallHeight?: number;
  rotation: number;
  layer: number;
}

export interface TempleBuild {
  version: 2;
  name: string;
  defaultMaterial: TempleMaterial;
  pieces: TemplePiece[];
}
