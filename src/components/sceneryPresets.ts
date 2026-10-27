/** Saved scenery IDs are stable. A choice changes the environment, never placed pieces. */
const gardenLight={sun:1.8,exposure:.95,sky:0xced9d5,sunColor:0xffedd0,fill:.14,ambient:.38,environment:.65};
const gardenGround={grass:[116,135,84],earth:[125,110,84],dry:[150,143,96],gravel:[146,142,124]};
export const sceneryPresets={
  garden:{name:"Garden",description:"Green landscape",skyTop:"#829dad",skyBottom:"#d9ddd0",swatch:"#778b55",water:"#537d80",ground:gardenGround,light:gardenLight,reflection:[0x9dbbd4,0xd8dfd8,0x535c41],hills:1,forest:"mixed"},
  desert:{name:"Desert",description:"Warm sandstone",skyTop:"#95a7b5",skyBottom:"#e9d0a6",swatch:"#bea175",water:"#537d80",ground:{grass:[173,145,105],earth:[146,115,81],dry:[192,162,117],gravel:[166,151,124]},light:{sun:2.05,exposure:.92,sky:0xe3cda7,sunColor:0xffe3b8,fill:.12,ambient:.34,environment:.6},reflection:[0xb4c9d4,0xe3cda7,0x8b7452],hills:1,forest:"none"},
  twilight:{name:"Twilight",description:"Evening light",skyTop:"#101c39",skyBottom:"#d79577",swatch:"#66794e",water:"#697e9e",ground:gardenGround,light:{sun:1.6,exposure:1.05,sky:0x9a8592,sunColor:0xffbd90,fill:.24,ambient:.48,environment:.85},reflection:[0x283650,0xcc8c6e,0x535c41],hills:1,forest:"mixed"},
  autumn:{name:"Autumn Forest",description:"Amber leaves · warm woodland",skyTop:"#809cae",skyBottom:"#edcf9e",swatch:"#9a8953",water:"#647d78",ground:{grass:[130,131,79],earth:[132,106,77],dry:[165,140,88],gravel:[147,137,116]},light:{...gardenLight,sunColor:0xffd4a0,sky:0xd6c5a8,exposure:.98},reflection:[0x9ab7c9,0xe3cfac,0x65583c],hills:1,forest:"autumn"},
  alpine:{name:"Alpine Meadow",description:"Pine groves · snowy peaks",skyTop:"#739dbd",skyBottom:"#d7e5e8",swatch:"#728b72",water:"#72a2aa",ground:{grass:[107,133,104],earth:[117,120,101],dry:[142,148,117],gravel:[143,149,145]},light:{...gardenLight,sun:1.9,sunColor:0xf1f5ff,sky:0xc9dce7,exposure:.96},reflection:[0x8ab4d5,0xe2ebed,0x4d6259],hills:2.8,forest:"pine"},
  coast:{name:"Coast",description:"Pale sand · cypress · open water",skyTop:"#6bacc4",skyBottom:"#dce6d5",swatch:"#c9bc98",water:"#4a8794",ground:{grass:[185,177,139],earth:[151,145,118],dry:[207,195,157],gravel:[170,169,148]},light:{...gardenLight,sun:1.95,sunColor:0xfff0d6,sky:0xc8e0df,exposure:.98},reflection:[0x87c0d4,0xdbe9de,0x7a7d65],hills:0,forest:"cypress"}
} as const;
export type LandscapeTheme=keyof typeof sceneryPresets;
export const sceneryThemes=Object.keys(sceneryPresets) as LandscapeTheme[];
export const isSceneryTheme=(value:unknown):value is LandscapeTheme=>typeof value==="string"&&Object.prototype.hasOwnProperty.call(sceneryPresets,value);
