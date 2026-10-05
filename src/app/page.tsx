"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const TempleWorld = dynamic(() => import("@/components/Temple3DPreview"), {
  ssr: false,
  loading: () => <div className="flex h-[100dvh] items-center justify-center bg-[#b9c4cb] text-black/50">Opening building site…</div>,
});

export type BuildingShape = "rectangle" | "square" | "wide" | "l-shape" | "t-shape" | "u-shape" | "cross" | "octagon" | "rotunda" | "courtyard" | "star" | "six-star" | "circle" | "triangle" | "hexagon" | "diamond" | "oval" | "horseshoe" | "x-shape" | "ring";
export type BuilderMaterial = "marble" | "sandstone" | "limestone" | "obsidian";
export type RoofStyle = "flat" | "pyramid" | "dome" | "cone" | "steeple" | "none";
export type WallFace = "front" | "back" | "left" | "right";
export type WindowStyle = "classic" | "tall" | "arched" | "round" | "double" | "rose" | "stained";
export type DoorStyle = "single" | "double" | "arched" | "bronze" | "temple" | "portico";
export type WindowAttachment = { id: string; face: WallFace; u: number; v: number; width: number; height: number; style: WindowStyle; };
export type DoorAttachment = { id: string; face: WallFace; u: number; width: number; height: number; style: DoorStyle; };
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
  const [detailCategory, setDetailCategory] = useState<"windows"|"doors"|"trim"|"columns"|"arches"|null>(null);
  const [panel, setPanel] = useState<"walls" | "buildings" | "fountains" | "statues" | "stairs" | "more" | "edit" | null>("buildings");

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
    setLevels([{ id: "level-1", shape: next, material, width: next === "wide" ? 46 : next === "courtyard" ? 46 : next === "oval" ? 42 : next === "u-shape" ? 42 : next === "horseshoe" || next === "x-shape" || next === "t-shape" || next === "cross" ? 40 : next === "l-shape" ? 38 : next === "star" || next === "six-star" || next === "circle" || next === "triangle" || next === "hexagon" || next === "diamond" || next === "ring" ? 36 : next === "square" || next === "octagon" || next === "rotunda" ? 28 : 34, depth: next === "wide" ? 24 : next === "courtyard" ? 40 : next === "horseshoe" || next === "x-shape" ? 38 : next === "u-shape" || next === "star" || next === "six-star" || next === "circle" || next === "hexagon" || next === "ring" ? 36 : next === "l-shape" || next === "t-shape" || next === "triangle" || next === "diamond" ? 34 : next === "oval" ? 30 : next === "cross" ? 40 : next === "square" || next === "octagon" || next === "rotunda" ? 28 : 26, height: 22, roof: "flat", patio: false, x: 0, z: 0, rotation: 0, windows: [], doors: [] }]);
    setSelectedLevel(0);
    setPanel(null);
  };

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-[#b9c4cb] text-white">
      <TempleWorld levels={levels} perimeter={perimeter} statues={statues} selectedStatueId={selectedStatueId} selectedLevel={selectedLevel}
        onSelectLevel={(index) => { setSelectedLevel(index); setPanel("edit"); }}
        onSelectFace={(index,face) => { setSelectedLevel(index); setSelectedFace(face); setPanel("edit"); }}
        onMoveLevel={(index,x,z) => setLevels(current => current.map((l,i)=>i===index?{...l,x,z}:l))}
        onPatioChange={(index,patio) => setLevels(current => current.map((l,i)=>i===index?{...l,patio}:l))}
        onMoveWindow={(levelIndex,id,u,v) => setLevels(current => current.map((l,i)=>i===levelIndex?{...l,windows:l.windows.map(win=>win.id===id?{...win,u,v}:win)}:l))}
        onSelectPerimeter={()=>{setPanel("walls");setWallStep("features");}}
        onSelectStatue={(id)=>{setSelectedStatueId(id);setPanel("statues");}}
        onMoveStatue={(id,x,z)=>setStatues(v=>v.map(s=>s.id===id?{...s,x,z}:s))} />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-3">
        <div className="rounded-2xl bg-black/50 px-4 py-2 backdrop-blur">
          <div className="text-[10px] uppercase tracking-[.22em] text-amber-200/80">Echoes</div>
          <div className="text-sm font-semibold">Temple Builder</div>
        </div>
        {shape && <button onClick={() => setPanel(panel === "edit" ? null : "edit")} className="pointer-events-auto rounded-2xl bg-black/55 px-4 py-3 text-sm font-medium backdrop-blur">Edit building</button>}
      </div>

      {!shape && (
        <div className="pointer-events-none absolute inset-x-5 top-[20%] z-10 rounded-3xl bg-black/40 p-5 text-center backdrop-blur-sm">
          <div className="text-xl font-semibold">Choose your starting building</div>
          <div className="mt-1 text-sm text-white/70">It will be placed directly on the building site.</div>
        </div>
      )}

      {panel === "edit" && shape && levels[selectedLevel] && (
        <div className="absolute left-3 right-3 top-[76px] z-30 max-h-[55vh] overflow-y-auto rounded-3xl bg-[#111820]/95 p-4 shadow-2xl backdrop-blur">
          <div className="mb-3 flex items-center justify-between"><span className="font-semibold">Level {selectedLevel + 1}</span><button onClick={() => setPanel(null)} className="text-sm text-white/60">Done</button></div>
          <div className="mb-3 flex gap-2 overflow-x-auto">
            {levels.map((_,i)=><button key={i} onClick={()=>setSelectedLevel(i)} className={`shrink-0 rounded-xl px-3 py-2 text-xs ${i===selectedLevel?"bg-amber-200 text-black":"bg-white/10"}`}>Level {i+1}</button>)}
            {levels.length<4 && <button onClick={()=>{const base=levels[levels.length-1];setLevels([...levels,{...base,id:`level-${levels.length+1}`,width:Math.max(16,Math.round(base.width*.84)),depth:Math.max(16,Math.round(base.depth*.84)),roof:"flat",patio:false,x:0,z:0,rotation:0,windows:[],doors:[]}]);setSelectedLevel(levels.length);}} className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-xs">+ Stack level</button>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-white/70">Width<input className="mt-2 w-full" type="range" min="16" max="60" value={levels[selectedLevel].width} onChange={e=>setLevels(levels.map((l,i)=>i===selectedLevel?{...l,width:Number(e.target.value)}:l))}/></label>
            <label className="text-xs text-white/70">Length<input className="mt-2 w-full" type="range" min="16" max="60" value={levels[selectedLevel].depth} onChange={e=>setLevels(levels.map((l,i)=>i===selectedLevel?{...l,depth:Number(e.target.value)}:l))}/></label>
            <label className="text-xs text-white/70">Height<input className="mt-2 w-full" type="range" min="12" max="45" value={levels[selectedLevel].height} onChange={e=>setLevels(levels.map((l,i)=>i===selectedLevel?{...l,height:Number(e.target.value)}:l))}/></label>
            <label className="text-xs text-white/70">Material<select className="mt-1 w-full rounded-lg bg-white/10 p-2 text-white" value={levels[selectedLevel].material} onChange={e=>setLevels(levels.map((l,i)=>i===selectedLevel?{...l,material:e.target.value as BuilderMaterial}:l))}><option value="marble">White Marble</option><option value="sandstone">Sandstone</option><option value="limestone">Limestone</option><option value="obsidian">Obsidian</option></select></label>
            <label className="text-xs text-white/70">Roof<select className="mt-1 w-full rounded-lg bg-white/10 p-2 text-white" value={levels[selectedLevel].roof} onChange={e=>setLevels(levels.map((l,i)=>i===selectedLevel?{...l,roof:e.target.value as RoofStyle}:l))}><option value="flat">Flat</option><option value="pyramid">Pyramid</option><option value="dome">Dome</option><option value="cone">Cone</option><option value="steeple">Steeple</option><option value="none">No roof</option></select></label>
            <label className="text-xs text-white/70">Rotate<input className="mt-2 w-full" type="range" min="-180" max="180" step="5" value={levels[selectedLevel].rotation} onChange={e=>setLevels(levels.map((l,i)=>i===selectedLevel?{...l,rotation:Number(e.target.value)}:l))}/></label>
            <div className="col-span-2 rounded-xl bg-white/5 p-3 text-xs text-white/60">Drag the selected upper level directly on the building to reposition it. It snaps to the roof grid.</div>
          </div>
          <div className="mt-3 rounded-xl bg-white/5 p-3 text-xs text-white/60">
            Doors: {selectedLevel===0 || levels[selectedLevel].patio ? "allowed on this level" : "upper-level doors require an exposed roof/patio"}
          </div>
          <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs font-semibold text-white/80">Wall surface</div>
            <div className="mt-1 text-xs text-white/50">{selectedFace ? `${selectedFace} wall selected` : "Tap a wall face on the building to customize it."}</div>
            {selectedFace && <>
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {(["windows","doors","trim","columns","arches"] as const).map(cat=><button key={cat} disabled={cat==="doors"&&selectedLevel>0&&!levels[selectedLevel].patio} onClick={()=>setDetailCategory(cat)} className={`rounded-xl px-4 py-2 text-xs capitalize disabled:opacity-30 ${detailCategory===cat?"bg-amber-200 text-black":"bg-white/10"}`}>{cat}</button>)}
              </div>
              {detailCategory==="windows" && <div className="mt-3 flex gap-2 overflow-x-auto">
                {([["classic","Classic"],["tall","Tall"],["arched","Arched"],["round","Round"],["double","Double"],["rose","Rose"],["stained","Stained Glass"]] as [WindowStyle,string][]).map(([style,name])=><button key={style} onClick={()=>setLevels(levels.map((l,i)=>i===selectedLevel?{...l,windows:[...l.windows,{id:`window-${Date.now()}`,face:selectedFace,u:0,v:.55,width:style==="double"?1.7:style==="round"||style==="rose"?1.25:1,height:style==="tall"||style==="arched"?1.7:1.25,style}]}:l))} className="min-w-[105px] rounded-xl bg-white/10 p-3 text-left text-xs"><div className="mb-2 h-8 rounded border border-amber-100/40"/>{name}</button>)}
              </div>}
              {detailCategory==="doors" && <div className="mt-3 flex gap-2 overflow-x-auto">
                {([["single","Single"],["double","Double"],["arched","Arched"],["bronze","Bronze"],["temple","Temple"],["portico","Portico"]] as [DoorStyle,string][]).map(([style,name])=><button key={style} onClick={()=>setLevels(levels.map((l,i)=>i===selectedLevel?{...l,doors:[...l.doors,{id:`door-${Date.now()}`,face:selectedFace,u:0,width:style==="double"||style==="temple"||style==="portico"?1.8:1.1,height:style==="temple"||style==="portico"?2.5:2,style}]}:l))} className="min-w-[105px] rounded-xl bg-white/10 p-3 text-left text-xs"><div className="mb-2 h-8 rounded border border-amber-100/40"/>{name}</button>)}
              </div>}
              {(detailCategory==="trim"||detailCategory==="columns"||detailCategory==="arches") && <div className="mt-3 rounded-xl bg-white/5 p-3 text-xs text-white/50">Multiple {detailCategory} styles are next in the same catalog system.</div>}
            </>}
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 z-30 rounded-t-[28px] border-t border-white/10 bg-[#111820]/95 pb-[max(10px,env(safe-area-inset-bottom))] shadow-2xl backdrop-blur">
        <div className="flex gap-1 overflow-x-auto p-2">
          {(["walls","buildings","fountains","statues","stairs","more"] as const).map((item) => (
            <button key={item} onClick={()=>{setPanel(panel===item?null:item);if(item==="walls")setWallStep(perimeter?"features":"main");}}
              className={`shrink-0 rounded-xl px-4 py-3 text-xs font-medium capitalize ${panel===item ? "bg-amber-200 text-black" : "text-white/65"}`}>
              {item}
            </button>
          ))}
        </div>
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
            {([["rectangle","Classic"],["circle","Circle"],["octagon","Octagon"],["star","Star"]] as [PerimeterStyle,string][]).map(([style,name])=><button key={style} onClick={()=>{setPerimeter({style,material:"marble",margin:3,height:2.5,thickness:.28,towerShape:"round",towers:false,gate:false,arches:false,columns:false});setWallStep("features");}} className="min-w-[112px] rounded-2xl border border-white/10 bg-white/5 p-3 text-left"><div className="mb-2 h-9 rounded-md border-2 border-amber-100/60 bg-amber-100/10"/><div className="text-sm font-medium">{name}</div></button>)}
          </div>
        )}
        {panel === "walls" && perimeter && wallStep === "features" && (
          <div className="flex gap-2 overflow-x-auto border-t border-white/10 px-3 py-3">
            {([["towers","Towers"],["gate","Gate"],["arches","Arches"],["columns","Columns"]] as [PerimeterFeature,string][]).map(([key,name])=><button key={key} onClick={()=>setPerimeter(p=>p?{...p,[key]:!p[key]}:p)} className={`min-w-[104px] rounded-2xl border p-3 text-left ${perimeter[key]?"border-amber-200 bg-amber-200/15":"border-white/10 bg-white/5"}`}><div className="mb-2 h-9 rounded-md border border-amber-100/40"/><div className="text-sm">{name}</div></button>)}
            <button onClick={()=>setWallStep("options")} className="min-w-[104px] rounded-2xl border border-white/10 bg-white/5 p-3 text-left"><div className="mb-2 h-9 rounded-md border border-amber-100/40"/><div className="text-sm">Options</div></button>
            <button onClick={()=>setPanel(null)} className="min-w-[82px] rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">Done</button>
          </div>
        )}
        {panel === "walls" && perimeter && wallStep === "options" && (
          <div className="flex gap-2 overflow-x-auto border-t border-white/10 px-3 py-3">
            <button onClick={()=>setWallStep("features")} className="min-w-[74px] rounded-2xl bg-white/5 p-3 text-sm">‹ Back</button>
            {(["marble","sandstone","limestone","obsidian"] as BuilderMaterial[]).map(m=><button key={m} onClick={()=>setPerimeter(p=>p?{...p,material:m}:p)} className={`min-w-[100px] rounded-2xl border p-3 text-sm capitalize ${perimeter.material===m?"border-amber-200 bg-amber-200/15":"border-white/10 bg-white/5"}`}>{m}</button>)}
            {perimeter.towers && (["round","square","octagon","hexagon","star","spire"] as TowerShape[]).map(t=><button key={t} onClick={()=>setPerimeter(p=>p?{...p,towerShape:t}:p)} className={`min-w-[100px] rounded-2xl border p-3 text-sm capitalize ${perimeter.towerShape===t?"border-amber-200 bg-amber-200/15":"border-white/10 bg-white/5"}`}>{t} tower</button>)}
            <label className="min-w-[145px] rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">Distance<input type="range" min="1" max="8" step=".25" value={perimeter.margin} onChange={e=>setPerimeter(p=>p?{...p,margin:Number(e.target.value)}:p)} className="mt-2 w-full"/></label>
            <label className="min-w-[145px] rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">Height<input type="range" min="1" max="8" step=".25" value={perimeter.height} onChange={e=>setPerimeter(p=>p?{...p,height:Number(e.target.value)}:p)} className="mt-2 w-full"/></label>
            <label className="min-w-[145px] rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">Thickness<input type="range" min=".15" max=".8" step=".05" value={perimeter.thickness} onChange={e=>setPerimeter(p=>p?{...p,thickness:Number(e.target.value)}:p)} className="mt-2 w-full"/></label>
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
