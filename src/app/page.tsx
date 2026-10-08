"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const TempleWorld = dynamic(() => import("@/components/Temple3DPreview"), {
  ssr: false,
  loading: () => <div className="flex h-[100dvh] items-center justify-center bg-[#b9c4cb] text-black/50">Opening building site…</div>,
});

export type BuildingShape = "rectangle" | "square" | "wide" | "l-shape" | "t-shape" | "u-shape" | "cross" | "octagon" | "rotunda" | "courtyard" | "star" | "six-star" | "circle" | "triangle" | "hexagon" | "diamond" | "oval" | "horseshoe" | "x-shape" | "ring";
export type BuilderMaterial = "marble" | "sandstone" | "limestone" | "obsidian" | "granite" | "travertine" | "brick" | "stone" | "concrete" | "stucco" | "plaster" | "timber" | "bronze" | "gold";
export type RoofStyle = "flat" | "pyramid" | "dome" | "cone" | "steeple" | "tiered" | "curved" | "ornate" | "none";
export type WallFace = "front" | "back" | "left" | "right";
export type WindowStyle = "classic" | "tall" | "arched" | "round" | "double" | "rose" | "stained" | "narrow" | "twin" | "ornate";
export type DoorStyle = "single" | "double" | "arched" | "bronze" | "temple" | "portico" | "wood-arch" | "stone-arch" | "grand-arch" | "carved-stone" | "metal-gate";
export type WindowAttachment = { id: string; face: WallFace; u: number; v: number; width: number; height: number; style: WindowStyle; };
export type DoorAttachment = { id: string; face: WallFace; u: number; width: number; height: number; style: DoorStyle; };
export type ArchStyle = "flat"|"round"|"segmental"|"horseshoe"|"pointed"|"three-pointed"|"pointed-segmental"|"parabolic"|"inflected"|"round-rampant"|"ogee"|"oriental"|"trefoil"|"pointed-trefoil"|"three-centered"|"four-centered"|"tudor"|"keyhole"|"reverse-ogee"|"cinquefoil"|"pointed-cinquefoil"|"multifoil"|"lancet"|"venetian"|"florentine";
export type ColumnStyle = "doric"|"ionic"|"corinthian"|"composite"|"tuscan"|"fluted"|"square"|"twisted"|"gothic"|"roman-esque";
export type TrimStyle = "base"|"crown"|"dentils"|"frieze"|"greek-fret"|"acanthus"|"rosette"|"baroque-scroll"|"antefix"|"gargoyle";
export type StairStyle = "straight"|"wide"|"curved"|"spiral"|"split"|"corner";
export type PedimentStyle = "straight"|"triangular"|"segmental"|"broken-triangular"|"broken-segmental"|"swan-neck"|"stepped"|"ornate";
export type ArchAttachment = { id:string; face:WallFace; u:number; style:ArchStyle; };
export type ColumnAttachment = { id:string; face:WallFace; u:number; style:ColumnStyle; };
export type TrimAttachment = { id:string; face:WallFace; style:TrimStyle; };
export type StairAttachment = { id:string; face:WallFace; u:number; style:StairStyle; };
export type PedimentAttachment = { id:string; face:WallFace; u:number; style:PedimentStyle; };
export type PerimeterStyle = "rectangle"|"circle"|"octagon"|"star";
export type PerimeterFeature = "towers"|"gate"|"arches"|"columns";
export type TowerShape = "round"|"square"|"octagon"|"hexagon"|"star"|"spire";
export type Perimeter = { style:PerimeterStyle; material:BuilderMaterial; margin:number; height:number; thickness:number; towerShape:TowerShape; towers:boolean; gate:boolean; arches:boolean; columns:boolean; };
export type StatueKind = "guardian"|"angel"|"lion";
export type StatueFinish = "marble"|"bronze"|"gold"|"obsidian";
export type Statue = { id:string; kind:StatueKind; finish:StatueFinish; x:number; z:number; rotation:number; scale:number; };
export type BuildingLevel = {
  id: string;
  shape: BuildingShape;
  material: BuilderMaterial;
  width: number;
  depth: number;
  height: number;
  roof: RoofStyle;
  patio: boolean;
  x: number;
  z: number;
  rotation: number;
  windows: WindowAttachment[];
  doors: DoorAttachment[];
  arches: ArchAttachment[];
  columns: ColumnAttachment[];
  trims: TrimAttachment[];
  stairs: StairAttachment[];
  pediments: PedimentAttachment[];
};

export default function TempleBuilderPage() {
  const [shape, setShape] = useState<BuildingShape | null>(null);
  const [material, setMaterial] = useState<BuilderMaterial>("marble");
  const [width, setWidth] = useState(32);
  const [depth, setDepth] = useState(26);
  const [height, setHeight] = useState(22);
  const [roof, setRoof] = useState<RoofStyle>("flat");
  const [levels, setLevels] = useState<BuildingLevel[]>([]);
  const [perimeter, setPerimeter] = useState<Perimeter | null>(null);
  const [statues, setStatues] = useState<Statue[]>([]);
  const [selectedStatueId, setSelectedStatueId] = useState<string | null>(null);
  const [wallStep, setWallStep] = useState<"main"|"features"|"options">("main");
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [selectedFace, setSelectedFace] = useState<WallFace | null>(null);
  const [detailCategory, setDetailCategory] = useState<"levels"|"windows"|"doors"|"trim"|"columns"|"arches"|"stairs"|"pediments"|"roof"|"material"|null>(null);
  const [panel, setPanel] = useState<"add" | "walls" | "buildings" | "fountains" | "statues" | "stairs" | "more" | "edit" | null>(null);

  const chooseShape = (next: BuildingShape) => {
    setShape(next);
    if (next === "square") { setWidth(28); setDepth(28); }
    if (next === "rectangle") { setWidth(34); setDepth(26); }
    if (next === "wide") { setWidth(46); setDepth(24); }
    if (next === "l-shape") { setWidth(38); setDepth(34); }
    if (next === "t-shape") { setWidth(40); setDepth(34); }
    if (next === "u-shape") { setWidth(42); setDepth(36); }
    if (next === "cross") { setWidth(40); setDepth(40); }
    if (next === "octagon") { setWidth(32); setDepth(32); }
    if (next === "rotunda") { setWidth(32); setDepth(32); }
    if (next === "courtyard") { setWidth(46); setDepth(40); }
    if (next === "star" || next === "six-star" || next === "circle" || next === "hexagon" || next === "ring") { setWidth(36); setDepth(36); }
    if (next === "triangle" || next === "diamond") { setWidth(36); setDepth(34); }
    if (next === "oval") { setWidth(42); setDepth(30); }
    if (next === "horseshoe" || next === "x-shape") { setWidth(40); setDepth(38); }
    setHeight(22);
    setLevels([{ id: "level-1", shape: next, material, width: next === "wide" ? 46 : next === "courtyard" ? 46 : next === "oval" ? 42 : next === "u-shape" ? 42 : next === "horseshoe" || next === "x-shape" || next === "t-shape" || next === "cross" ? 40 : next === "l-shape" ? 38 : next === "star" || next === "six-star" || next === "circle" || next === "triangle" || next === "hexagon" || next === "diamond" || next === "ring" ? 36 : next === "square" || next === "octagon" || next === "rotunda" ? 28 : 34, depth: next === "wide" ? 24 : next === "courtyard" ? 40 : next === "horseshoe" || next === "x-shape" ? 38 : next === "u-shape" || next === "star" || next === "six-star" || next === "circle" || next === "hexagon" || next === "ring" ? 36 : next === "l-shape" || next === "t-shape" || next === "triangle" || next === "diamond" ? 34 : next === "oval" ? 30 : next === "cross" ? 40 : next === "square" || next === "octagon" || next === "rotunda" ? 28 : 26, height: 22, roof: "flat", patio: false, x: 0, z: 0, rotation: 0, windows: [], doors: [], arches: [], columns: [], trims: [], stairs: [], pediments: [] }]);
    setSelectedLevel(0);
    setPanel("edit");
    setDetailCategory(null);
  };

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-[#b9c4cb] text-white">
      <TempleWorld levels={levels} perimeter={perimeter} statues={statues} selectedStatueId={selectedStatueId} selectedLevel={selectedLevel}
        onSelectLevel={(index) => { setSelectedLevel(index); setSelectedFace(null); setDetailCategory(null); setPanel("edit"); }}
        onSelectFace={(index,face) => { setSelectedLevel(index); setSelectedFace(face); }}
        onMoveLevel={(index,x,z) => {
          // Keep upper levels locked to the building center during normal editing.
          // Level 1 can still define the building's base position.
          if (index > 0) return;
          setLevels(current => current.map((l,i)=>i===index?{...l,x,z}:l));
        }}
        onPatioChange={(index,patio) => setLevels(current => current.map((l,i)=>i===index?{...l,patio}:l))}
        onMoveWindow={(levelIndex,id,u,v) => setLevels(current => current.map((l,i)=>i===levelIndex?{...l,windows:l.windows.map(win=>win.id===id?{...win,u,v}:win)}:l))}
        onMoveDoor={(levelIndex,id,u) => setLevels(current => current.map((l,i)=>i===levelIndex?{...l,doors:l.doors.map(door=>door.id===id?{...door,u}:door)}:l))}
        onMoveArch={(levelIndex,id,u) => setLevels(current => current.map((l,i)=>i===levelIndex?{...l,arches:l.arches.map(arch=>arch.id===id?{...arch,u}:arch)}:l))}
        onResizePerimeter={(margin)=>setPerimeter(p=>p?{...p,margin}:p)}
        onSelectPerimeter={()=>{setPanel("walls");setWallStep("features");}}
        onSelectStatue={(id)=>{setSelectedStatueId(id);setPanel("statues");}}
        onMoveStatue={(id,x,z)=>setStatues(v=>v.map(s=>s.id===id?{...s,x,z}:s))} />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-3">
        <div className="rounded-2xl bg-black/50 px-4 py-2 backdrop-blur">
          <div className="text-[10px] uppercase tracking-[.22em] text-amber-200/80">Echoes</div>
          <div className="text-sm font-semibold">Temple Builder</div>
        </div>
        
      </div>

      {!shape && (
        <div className="pointer-events-none absolute inset-x-5 top-[20%] z-10 rounded-3xl bg-black/40 p-5 text-center backdrop-blur-sm">
          <div className="text-xl font-semibold">Choose your starting building</div>
          <div className="mt-1 text-sm text-white/70">It will be placed directly on the building site.</div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 z-30 rounded-t-[28px] border-t border-white/10 bg-[#111820]/95 pb-[max(10px,env(safe-area-inset-bottom))] shadow-2xl backdrop-blur">
        <div className="flex items-center gap-2 p-2">
          {panel === null && (
            <button onClick={()=>setPanel("add")} className="w-full rounded-2xl bg-amber-200 px-5 py-3 text-sm font-semibold text-black">＋ Add</button>
          )}
          {panel !== null && panel !== "edit" && (
            <>
              <button onClick={()=>setPanel(panel==="add"?null:"add")} className="shrink-0 rounded-xl bg-white/10 px-4 py-3 text-xs">{panel==="add"?"Done":"‹ Add"}</button>
              <div className="min-w-0 flex-1 truncate text-sm font-semibold capitalize text-white/80">{panel==="add"?"Choose what to add":panel}</div>
              <button onClick={()=>setPanel(null)} className="shrink-0 rounded-xl bg-white/10 px-4 py-3 text-xs">Close</button>
            </>
          )}
          {panel === "edit" && (
            <>
              <div className="min-w-0 flex-1 truncate text-sm font-semibold text-white/80">Edit Building</div>
              <button onClick={()=>{setDetailCategory(null);setPanel(null)}} className="shrink-0 rounded-xl bg-white/10 px-4 py-3 text-xs">Done</button>
            </>
          )}
        </div>
        {panel === "add" && (
          <div className="grid grid-cols-3 gap-2 border-t border-white/10 px-3 py-3">
            {([
              ["buildings","Building","▣"],["walls","Walls","⬡"],["fountains","Fountain","◉"],
              ["statues","Statue","♟"],["stairs","Stairs","▤"],["more","More","＋"]
            ] as const).map(([id,name,icon])=>(
              <button key={id} onClick={()=>{setPanel(id);if(id==="walls")setWallStep(perimeter?"features":"main");}} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                <div className="text-xl text-amber-200">{icon}</div><div className="mt-1 text-xs font-medium">{name}</div>
              </button>
            ))}
          </div>
        )}
        {panel === "edit" && shape && levels[selectedLevel] && (
          <div className="border-t border-white/10">
            {!detailCategory && <div className="flex gap-2 overflow-x-auto px-3 py-3">
              {(["levels","doors","windows","arches","columns","stairs","pediments","trim","roof","material"] as const).map(cat=><button key={cat} onClick={()=>setDetailCategory(cat)} className="min-w-[96px] shrink-0 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs capitalize">{cat}</button>)}
              <button onClick={()=>setPanel(null)} className="min-w-[78px] shrink-0 rounded-2xl bg-white/10 p-3 text-xs">Done</button>
            </div>}
            {detailCategory && <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
              <button onClick={()=>setDetailCategory(null)} className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-xs">Back</button>
              <span className="text-xs font-semibold capitalize text-white/70">{detailCategory}</span>
            </div>}
            {detailCategory==="levels" && <div className="flex gap-2 overflow-x-auto px-3 py-3">
              {levels.map((_,i)=><button key={i} onClick={()=>setSelectedLevel(i)} className={`min-w-[90px] shrink-0 rounded-xl p-3 text-xs ${i===selectedLevel?"bg-amber-200 text-black":"bg-white/10"}`}>Level {i+1}</button>)}
              <label className="min-w-[150px] shrink-0 rounded-xl bg-white/10 p-3 text-xs text-white/70">Width <span className="float-right text-white">{Math.round(levels[selectedLevel].width)}</span><input aria-label="Level width" type="range" min="10" max="70" step="1" value={levels[selectedLevel].width} onChange={e=>setLevels(v=>v.map((l,i)=>i===selectedLevel?{...l,width:Number(e.target.value)}:l))} className="mt-2 w-full"/></label>
              <label className="min-w-[150px] shrink-0 rounded-xl bg-white/10 p-3 text-xs text-white/70">Depth <span className="float-right text-white">{Math.round(levels[selectedLevel].depth)}</span><input aria-label="Level depth" type="range" min="10" max="70" step="1" value={levels[selectedLevel].depth} onChange={e=>setLevels(v=>v.map((l,i)=>i===selectedLevel?{...l,depth:Number(e.target.value)}:l))} className="mt-2 w-full"/></label>
              <label className="min-w-[150px] shrink-0 rounded-xl bg-white/10 p-3 text-xs text-white/70">Height <span className="float-right text-white">{Math.round(levels[selectedLevel].height)}</span><input aria-label="Level height" type="range" min="6" max="45" step="1" value={levels[selectedLevel].height} onChange={e=>setLevels(v=>v.map((l,i)=>i===selectedLevel?{...l,height:Number(e.target.value)}:l))} className="mt-2 w-full"/></label>
              <label className="min-w-[150px] shrink-0 rounded-xl bg-white/10 p-3 text-xs text-white/70">Rotate <span className="float-right text-white">{Math.round(levels[selectedLevel].rotation)}°</span><input aria-label="Level rotation" type="range" min="-180" max="180" step="5" value={levels[selectedLevel].rotation} onChange={e=>setLevels(v=>v.map((l,i)=>i===selectedLevel?{...l,rotation:Number(e.target.value)}:l))} className="mt-2 w-full"/></label>
              <button onClick={()=>setLevels(v=>v.map((l,i)=>i===selectedLevel?{...l,x:0,z:0}:l))} className="min-w-[105px] shrink-0 rounded-xl bg-white/10 p-3 text-xs">Center Level</button>
              {levels.length<4 && <button onClick={()=>{const base=levels[levels.length-1];setLevels([...levels,{...base,id:`level-${levels.length+1}`,width:Math.max(16,Math.round(base.width*.84)),depth:Math.max(16,Math.round(base.depth*.84)),roof:"flat",patio:false,x:0,z:0,rotation:0,windows:[],doors:[],arches:[],columns:[],trims:[],stairs:[],pediments:[]}]);setSelectedLevel(levels.length);}} className="min-w-[100px] shrink-0 rounded-xl bg-white/10 p-3 text-xs">+ Add Level</button>}
              {([["star","Star"],["circle","Circle"],["six-star","6-Point Star"],["rectangle","Rectangle"],["square","Square"],["wide","Wide"],["l-shape","L Shape"],["t-shape","T Shape"],["u-shape","U Shape"],["cross","Cross"],["octagon","Octagon"],["rotunda","Rotunda"],["courtyard","Courtyard"],["triangle","Triangle"],["hexagon","Hexagon"],["diamond","Diamond"],["oval","Oval"],["horseshoe","Horseshoe"],["x-shape","X Shape"],["ring","Ring"]] as [BuildingShape,string][]).map(([id,name])=><button key={id} onClick={()=>setLevels(v=>v.map((l,i)=>i===selectedLevel?{...l,shape:id}:l))} className={`min-w-[100px] shrink-0 rounded-xl border p-3 text-xs ${levels[selectedLevel].shape===id?"border-amber-200 bg-amber-200/15":"border-white/10 bg-white/5"}`}>{name}</button>)}
            </div>}
            {detailCategory==="roof" && <div className="flex gap-2 overflow-x-auto px-3 py-3">{(["flat","pyramid","dome","tiered","curved","ornate","cone","steeple","none"] as RoofStyle[]).map(x=><button key={x} onClick={()=>setLevels(v=>v.map((l,i)=>i===selectedLevel?{...l,roof:x}:l))} className={`min-w-[100px] shrink-0 rounded-xl border p-3 text-xs capitalize ${levels[selectedLevel].roof===x?"border-amber-200 bg-amber-200/15":"border-white/10 bg-white/5"}`}>{x==="none"?"No roof":x}</button>)}</div>}
            {detailCategory==="material" && <div className="flex gap-2 overflow-x-auto px-3 py-3">{(["marble","sandstone","limestone","travertine","granite","obsidian","brick","stone","concrete","stucco","plaster","timber","bronze","gold"] as BuilderMaterial[]).map(m=><button key={m} onClick={()=>setLevels(v=>v.map((l,i)=>i===selectedLevel?{...l,material:m}:l))} className={`min-w-[110px] shrink-0 rounded-xl border p-3 text-xs capitalize ${levels[selectedLevel].material===m?"border-amber-200 bg-amber-200/15":"border-white/10 bg-white/5"}`}>{m}</button>)}</div>}
            {detailCategory==="windows" && <div className="flex gap-2 overflow-x-auto px-3 py-3">{!selectedFace&&<div className="shrink-0 px-2 py-3 text-xs text-white/60">Tap the wall where you want the window, then choose a style.</div>}{selectedFace&&([["narrow","Narrow"],["arched","Arch"],["twin","Twin Arch"],["rose","Rose Window"],["tall","Tall Window"],["ornate","Ornate"],["classic","Classic"],["double","Double"],["stained","Stained Glass"]] as [WindowStyle,string][]).map(([style,name])=><button key={style} onClick={()=>setLevels(v=>v.map((l,i)=>i===selectedLevel?{...l,windows:[...l.windows,{id:`window-${Date.now()}`,face:selectedFace,u:0,v:.55,width:style==="double"?1.7:style==="round"||style==="rose"?1.25:1,height:style==="tall"||style==="arched"?1.7:1.25,style}]}:l))} className="min-w-[105px] shrink-0 rounded-xl bg-white/10 p-3 text-xs">{name}</button>)}</div>}
            {detailCategory==="doors" && <div className="flex gap-2 overflow-x-auto px-3 py-3">{!selectedFace&&<div className="shrink-0 px-2 py-3 text-xs text-white/60">Tap the wall where you want the door, then choose a style.</div>}{selectedFace&&([["wood-arch","Wood Arch"],["stone-arch","Stone Arch"],["grand-arch","Grand Arch"],["double","Double Door"],["carved-stone","Carved Stone"],["metal-gate","Metal Gate"],["single","Single"],["bronze","Bronze"],["temple","Temple"],["portico","Portico"]] as [DoorStyle,string][]).map(([style,name])=><button key={style} disabled={selectedLevel>0&&!levels[selectedLevel].patio} onClick={()=>setLevels(v=>v.map((l,i)=>i===selectedLevel?{...l,doors:[...l.doors,{id:`door-${Date.now()}`,face:selectedFace,u:0,width:style==="double"||style==="temple"||style==="portico"||style==="grand-arch"||style==="metal-gate"?1.8:1.1,height:style==="temple"||style==="portico"||style==="grand-arch"?2.5:2,style}]}:l))} className="min-w-[105px] shrink-0 rounded-xl bg-white/10 p-3 text-xs disabled:opacity-30">{name}</button>)}</div>}
            {detailCategory==="trim" && <div className="flex gap-2 overflow-x-auto px-3 py-3">{!selectedFace&&<div className="shrink-0 px-2 py-3 text-xs text-white/60">Tap a wall, then choose trim.</div>}{selectedFace&&([["base","Base"],["crown","Crown"],["dentils","Dentils"],["frieze","Frieze"],["greek-fret","Greek Fret"],["acanthus","Acanthus"],["rosette","Rosette"],["baroque-scroll","Baroque Scroll"],["antefix","Antefix"],["gargoyle","Gargoyle"]] as [TrimStyle,string][]).map(([style,name])=><button key={style} onClick={()=>setLevels(v=>v.map((l,i)=>i===selectedLevel?{...l,trims:[...(l.trims||[]),{id:`trim-${Date.now()}`,face:selectedFace,style}]}:l))} className="min-w-[110px] shrink-0 rounded-xl bg-white/10 p-3 text-xs">{name}</button>)}</div>}
            {detailCategory==="columns" && <div className="flex gap-2 overflow-x-auto px-3 py-3">{!selectedFace&&<div className="shrink-0 px-2 py-3 text-xs text-white/60">Tap a wall, then place a column.</div>}{selectedFace&&([["doric","Doric"],["ionic","Ionic"],["corinthian","Corinthian"],["composite","Composite"],["tuscan","Tuscan"],["fluted","Fluted"],["square","Square"],["twisted","Twisted"],["gothic","Gothic"],["roman-esque","Romanesque"]] as [ColumnStyle,string][]).map(([style,name])=><button key={style} onClick={()=>setLevels(v=>v.map((l,i)=>i===selectedLevel?{...l,columns:[...(l.columns||[]),{id:`column-${Date.now()}`,face:selectedFace,u:0,style}]}:l))} className="min-w-[110px] shrink-0 rounded-xl bg-white/10 p-3 text-xs">{name}</button>)}</div>}
            {detailCategory==="arches" && <div className="flex gap-2 overflow-x-auto px-3 py-3">{!selectedFace&&<div className="shrink-0 px-2 py-3 text-xs text-white/60">Tap a wall, then choose an arch profile.</div>}{selectedFace&&([["flat","Flat"],["round","Round"],["segmental","Segmental"],["horseshoe","Horseshoe"],["pointed","Pointed"],["three-pointed","Three Pointed"],["pointed-segmental","Pointed Segmental"],["parabolic","Parabolic"],["inflected","Inflected"],["round-rampant","Round Rampant"],["ogee","Ogee"],["oriental","Oriental"],["trefoil","Trefoil"],["pointed-trefoil","Pointed Trefoil"],["three-centered","Three Centered"],["four-centered","Four Centered"],["tudor","Tudor"],["keyhole","Keyhole"],["reverse-ogee","Reverse Ogee"],["cinquefoil","Cinquefoil"],["pointed-cinquefoil","Pointed Cinquefoil"],["multifoil","Multifoil"],["lancet","Lancet"],["venetian","Venetian"],["florentine","Florentine"]] as [ArchStyle,string][]).map(([style,name])=><button key={style} onClick={()=>setLevels(v=>v.map((l,i)=>i===selectedLevel?{...l,arches:[...(l.arches||[]),{id:`arch-${Date.now()}`,face:selectedFace,u:0,style}]}:l))} className="min-w-[120px] shrink-0 rounded-xl bg-white/10 p-3 text-xs">{name}</button>)}</div>}
            {detailCategory==="stairs" && <div className="flex gap-2 overflow-x-auto px-3 py-3">{!selectedFace&&<div className="shrink-0 px-2 py-3 text-xs text-white/60">Tap the entrance wall, then choose stairs.</div>}{selectedFace&&(["straight","wide","curved","spiral","split","corner"] as StairStyle[]).map(style=><button key={style} onClick={()=>setLevels(v=>v.map((l,i)=>i===selectedLevel?{...l,stairs:[...(l.stairs||[]),{id:`stair-${Date.now()}`,face:selectedFace,u:0,style}]}:l))} className="min-w-[105px] shrink-0 rounded-xl bg-white/10 p-3 text-xs capitalize">{style}</button>)}</div>}
            {detailCategory==="pediments" && <div className="flex gap-2 overflow-x-auto px-3 py-3">{!selectedFace&&<div className="shrink-0 px-2 py-3 text-xs text-white/60">Tap a wall, then choose a pediment.</div>}{selectedFace&&([["straight","Straight"],["triangular","Triangular"],["segmental","Segmental"],["broken-triangular","Broken Triangular"],["broken-segmental","Broken Segmental"],["swan-neck","Swan Neck"],["stepped","Stepped"],["ornate","Ornate"]] as [PedimentStyle,string][]).map(([style,name])=><button key={style} onClick={()=>setLevels(v=>v.map((l,i)=>i===selectedLevel?{...l,pediments:[...(l.pediments||[]),{id:`pediment-${Date.now()}`,face:selectedFace,u:0,style}]}:l))} className="min-w-[125px] shrink-0 rounded-xl bg-white/10 p-3 text-xs">{name}</button>)}</div>}
          </div>
        )}
        {panel === "buildings" && (
          <div className="flex gap-2 overflow-x-auto border-t border-white/10 px-3 py-3">
            {[["star","5-Point Star"],["circle","Circle"],["six-star","6-Point Star"],["rectangle","Rectangle"],["square","Square"],["wide","Wide Hall"],["l-shape","L Shape"],["t-shape","T Shape"],["u-shape","U Shape"],["cross","Cross"],["octagon","Octagon"],["rotunda","Rotunda"],["courtyard","Courtyard"],["triangle","Triangle"],["hexagon","Hexagon"],["diamond","Diamond"],["oval","Oval"],["horseshoe","Horseshoe"],["x-shape","X Shape"],["ring","Ring"]].map(([id,name])=>(
              <button key={id} onClick={()=>chooseShape(id as BuildingShape)} className="min-w-[118px] rounded-2xl border border-white/10 bg-white/5 p-3 text-left">
                <div className="mb-2 h-10 rounded-md border-2 border-amber-100/60 bg-amber-100/10"/>
                <div className="text-sm font-medium">{name}</div>
              </button>
            ))}
          </div>
        )}
        {panel === "walls" && wallStep === "main" && (
          <div className="flex gap-2 overflow-x-auto border-t border-white/10 px-3 py-3">
            {([["rectangle","Classic"],["circle","Circle"],["octagon","Octagon"],["star","Star"]] as [PerimeterStyle,string][]).map(([style,name])=><button key={style} onClick={()=>{setPerimeter({style,material:"marble",margin:.65,height:1.25,thickness:.16,towerShape:"round",towers:false,gate:false,arches:false,columns:false});setWallStep("features");}} className="min-w-[112px] rounded-2xl border border-white/10 bg-white/5 p-3 text-left"><div className="mb-2 h-9 rounded-md border-2 border-amber-100/60 bg-amber-100/10"/><div className="text-sm font-medium">{name}</div></button>)}
          </div>
        )}
        {panel === "walls" && perimeter && wallStep === "features" && (
          <div className="flex gap-2 overflow-x-auto border-t border-white/10 px-3 py-3">
            {([["towers","Towers"],["gate","Gate"],["arches","Arches"],["columns","Columns"]] as [PerimeterFeature,string][]).map(([key,name])=><button key={key} onClick={()=>setPerimeter(p=>p?{...p,[key]:!p[key]}:p)} className={`min-w-[104px] rounded-2xl border p-3 text-left ${perimeter[key]?"border-amber-200 bg-amber-200/15":"border-white/10 bg-white/5"}`}><div className="mb-2 h-9 rounded-md border border-amber-100/40"/><div className="text-sm">{name}</div></button>)}
            <div className="min-w-[150px] shrink-0 rounded-2xl border border-amber-200/30 bg-amber-200/10 p-3 text-xs text-amber-100">Pinch the wall in/out to resize it</div>
            <button onClick={()=>setWallStep("options")} className="min-w-[92px] rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">Style</button>
            <button onClick={()=>setPanel(null)} className="min-w-[72px] rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">Done</button>
          </div>
        )}
        {panel === "walls" && perimeter && wallStep === "options" && (
          <div className="flex gap-2 overflow-x-auto border-t border-white/10 px-3 py-3">
            <button onClick={()=>setWallStep("features")} className="min-w-[74px] rounded-2xl bg-white/5 p-3 text-sm">‹ Back</button>
            {(["marble","sandstone","limestone","obsidian"] as BuilderMaterial[]).map(m=><button key={m} onClick={()=>setPerimeter(p=>p?{...p,material:m}:p)} className={`min-w-[100px] rounded-2xl border p-3 text-sm capitalize ${perimeter.material===m?"border-amber-200 bg-amber-200/15":"border-white/10 bg-white/5"}`}>{m}</button>)}
            {perimeter.towers && (["round","square","octagon","hexagon","star","spire"] as TowerShape[]).map(t=><button key={t} onClick={()=>setPerimeter(p=>p?{...p,towerShape:t}:p)} className={`min-w-[100px] rounded-2xl border p-3 text-sm capitalize ${perimeter.towerShape===t?"border-amber-200 bg-amber-200/15":"border-white/10 bg-white/5"}`}>{t} tower</button>)}
            <button onClick={()=>setPerimeter(p=>p?{...p,height:Math.max(.75,p.height-.25)}:p)} className="min-w-[88px] rounded-2xl bg-white/5 p-3 text-sm">Shorter</button>
            <button onClick={()=>setPerimeter(p=>p?{...p,height:Math.min(8,p.height+.25)}:p)} className="min-w-[88px] rounded-2xl bg-white/5 p-3 text-sm">Taller</button>
            <button onClick={()=>setPerimeter(p=>p?{...p,thickness:Math.max(.1,p.thickness-.05)}:p)} className="min-w-[88px] rounded-2xl bg-white/5 p-3 text-sm">Thinner</button>
            <button onClick={()=>setPerimeter(p=>p?{...p,thickness:Math.min(.8,p.thickness+.05)}:p)} className="min-w-[88px] rounded-2xl bg-white/5 p-3 text-sm">Thicker</button>
            <button onClick={()=>{setPerimeter(null);setWallStep("main");}} className="min-w-[100px] rounded-2xl bg-red-500/15 p-3 text-sm text-red-200">Remove</button>
          </div>
        )}
        {panel === "statues" && (
          <div className="flex gap-2 overflow-x-auto border-t border-white/10 px-3 py-3">
            {!selectedStatueId && ([["guardian","Guardian"],["angel","Angel"],["lion","Lion"]] as [StatueKind,string][]).map(([kind,name])=><button key={kind} onClick={()=>{const id=`statue-${Date.now()}`;setStatues(v=>[...v,{id,kind,finish:"marble",x:3,z:3,rotation:0,scale:1}]);setSelectedStatueId(id);}} className="min-w-[112px] rounded-2xl border border-white/10 bg-white/5 p-3 text-left"><div className="mb-2 h-9 rounded-md border border-amber-100/40"/><div className="text-sm">{name}</div></button>)}
            {selectedStatueId && statues.find(s=>s.id===selectedStatueId) && (()=>{const statue=statues.find(s=>s.id===selectedStatueId)!;return <>
              {(["marble","bronze","gold","obsidian"] as StatueFinish[]).map(f=><button key={f} onClick={()=>setStatues(v=>v.map(s=>s.id===statue.id?{...s,finish:f}:s))} className={`min-w-[96px] rounded-2xl border p-3 text-sm capitalize ${statue.finish===f?"border-amber-200 bg-amber-200/15":"border-white/10 bg-white/5"}`}>{f}</button>)}
              <label className="min-w-[140px] rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">Rotate<input type="range" min="-180" max="180" step="5" value={statue.rotation} onChange={e=>setStatues(v=>v.map(s=>s.id===statue.id?{...s,rotation:Number(e.target.value)}:s))} className="mt-2 w-full"/></label>
              <label className="min-w-[140px] rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">Size<input type="range" min=".5" max="2.5" step=".1" value={statue.scale} onChange={e=>setStatues(v=>v.map(s=>s.id===statue.id?{...s,scale:Number(e.target.value)}:s))} className="mt-2 w-full"/></label>
              <button onClick={()=>{setStatues(v=>[...v,{...statue,id:`statue-${Date.now()}`,x:statue.x+.6,z:statue.z+.6}]);setSelectedStatueId(null);}} className="min-w-[92px] rounded-2xl bg-white/5 p-3 text-sm">Duplicate</button>
              <button onClick={()=>{setStatues(v=>v.filter(s=>s.id!==statue.id));setSelectedStatueId(null);}} className="min-w-[82px] rounded-2xl bg-red-500/15 p-3 text-sm text-red-200">Delete</button>
              <button onClick={()=>setSelectedStatueId(null)} className="min-w-[82px] rounded-2xl bg-white/5 p-3 text-sm">Done</button>
            </>})()}
          </div>
        )}
        {panel && panel !== "buildings" && panel !== "walls" && panel !== "statues" && panel !== "edit" && (
          <div className="border-t border-white/10 px-4 py-4 text-center text-sm text-white/55">
            {panel === "fountains" ? "Place fountains as separate site pieces." :
             panel === "stairs" ? "Place stairs and entrances." :
             "More separate pieces will live here."}
          </div>
        )}
      </div>
    </main>
  );
}
