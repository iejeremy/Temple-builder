export type TempleMaterial =
  | "marble"
  | "sandstone"
  | "obsidian"
  | "limestone"
  | "gold"
  | "bronze";

export type TemplePieceType =
  | "base"
  | "stairs"
  | "column"
  | "wall"
  | "pediment"
  | "dome"
  | "tower"
  | "door"
  | "statue";

export type TempleTemplateId =
  | "classical"
  | "sanctuary"
  | "monumental";

export interface TemplePiece {
  id: string;
  type: TemplePieceType;
  material: TempleMaterial;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  layer: number;
}

export interface TempleBuild {
  version: 1;
  name: string;
  templateId: TempleTemplateId;
  material: TempleMaterial;
  width: number;
  height: number;
  columnCount: number;
  hasDome: boolean;
  hasPediment: boolean;
  hasStairs: boolean;
  pieces: TemplePiece[];
}
