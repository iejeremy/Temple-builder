import type {
  TempleBuild,
  TempleMaterial,
  TemplePieceType,
} from "./types";

export const TEMPLE_MATERIALS: {
  id: TempleMaterial;
  name: string;
  surface: string;
  accent: string;
}[] = [
  { id: "marble", name: "White Marble", surface: "#d9d4cc", accent: "#f5f2ec" },
  { id: "sandstone", name: "Sandstone", surface: "#b98b5b", accent: "#d8b184" },
  { id: "obsidian", name: "Obsidian", surface: "#1f2025", accent: "#50515b" },
  { id: "limestone", name: "Limestone", surface: "#c6b898", accent: "#e3d7b8" },
  { id: "gold", name: "Gold", surface: "#b8912f", accent: "#e1c05a" },
  { id: "bronze", name: "Bronze", surface: "#7f5d3f", accent: "#ad8358" },
];

export interface PieceDefinition {
  id: string;
  type: TemplePieceType;
  name: string;
  width: number;
  height: number;
  wallHeight?: number;
}

export const PIECE_CATEGORIES: {
  type: TemplePieceType;
  name: string;
  shortName: string;
}[] = [
  { type: "wall", name: "Walls", shortName: "Wall" },
  { type: "door", name: "Doors", shortName: "Door" },
  { type: "floor", name: "Floors", shortName: "Floor" },
  { type: "tower", name: "Towers", shortName: "Tower" },
  { type: "window", name: "Windows", shortName: "Window" },
  { type: "arch", name: "Arches", shortName: "Arch" },
  { type: "column", name: "Columns", shortName: "Column" },
  { type: "roof", name: "Roofs", shortName: "Roof" },
];

export const PIECE_LIBRARY: PieceDefinition[] = [
  { id: "wall-straight", type: "wall", name: "Standard Wall Room", width: 32, height: 32, wallHeight: 22 },
  { id: "wall-tall", type: "wall", name: "Tall Wall Room", width: 32, height: 32, wallHeight: 34 },
  { id: "door-single", type: "door", name: "Single Door", width: 9, height: 18 },
  { id: "door-double", type: "door", name: "Double Door", width: 15, height: 20 },
  { id: "floor-square", type: "floor", name: "Square Floor", width: 36, height: 10 },
  { id: "floor-wide", type: "floor", name: "Wide Floor", width: 55, height: 10 },
  { id: "tower-square", type: "tower", name: "Square Tower", width: 18, height: 42 },
  { id: "tower-round", type: "tower", name: "Round Tower", width: 18, height: 42 },
  { id: "window-rect", type: "window", name: "Rectangle Window", width: 7, height: 10 },
  { id: "window-arched", type: "window", name: "Arched Window", width: 8, height: 12 },
  { id: "arch-classic", type: "arch", name: "Classic Arch", width: 18, height: 22 },
  { id: "arch-wide", type: "arch", name: "Wide Arch", width: 28, height: 20 },
  { id: "column-round", type: "column", name: "Round Column", width: 6, height: 28 },
  { id: "column-square", type: "column", name: "Square Column", width: 7, height: 28 },
  { id: "roof-flat", type: "roof", name: "Flat Roof", width: 38, height: 9 },
  { id: "roof-pediment", type: "roof", name: "Pediment", width: 40, height: 16 },
  { id: "roof-dome", type: "roof", name: "Dome", width: 30, height: 20 },
];

export function createTempleBuild(): TempleBuild {
  return {
    version: 2,
    name: "My Temple",
    defaultMaterial: "marble",
    pieces: [],
  };
}

export function piecesForCategory(type: TemplePieceType) {
  return PIECE_LIBRARY.filter((piece) => piece.type === type);
}
