import type {
  TempleBuild,
  TempleMaterial,
  TempleTemplateId,
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

export const TEMPLE_TEMPLATES: {
  id: TempleTemplateId;
  name: string;
  description: string;
  defaults: Pick<
    TempleBuild,
    "width" | "height" | "columnCount" | "hasDome" | "hasPediment" | "hasStairs"
  >;
}[] = [
  {
    id: "classical",
    name: "Classical",
    description: "Balanced Greek/Roman frontage with columns and a pediment.",
    defaults: {
      width: 72,
      height: 62,
      columnCount: 6,
      hasDome: false,
      hasPediment: true,
      hasStairs: true,
    },
  },
  {
    id: "sanctuary",
    name: "Sanctuary",
    description: "A broader sacred structure built around an open central chamber.",
    defaults: {
      width: 82,
      height: 58,
      columnCount: 8,
      hasDome: true,
      hasPediment: false,
      hasStairs: true,
    },
  },
  {
    id: "monumental",
    name: "Monumental",
    description: "Tall, imposing architecture intended to read clearly at world scale.",
    defaults: {
      width: 66,
      height: 76,
      columnCount: 8,
      hasDome: true,
      hasPediment: true,
      hasStairs: true,
    },
  },
];

export function createTempleBuild(
  templateId: TempleTemplateId = "classical",
  material: TempleMaterial = "marble"
): TempleBuild {
  const template =
    TEMPLE_TEMPLATES.find((candidate) => candidate.id === templateId) ??
    TEMPLE_TEMPLATES[0];

  return {
    version: 1,
    name: "My Temple",
    templateId: template.id,
    material,
    ...template.defaults,
    pieces: [],
  };
}
