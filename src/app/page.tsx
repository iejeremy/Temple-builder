"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const TempleWorld = dynamic(() => import("@/components/Temple3DPreview"), {
  ssr: false,
  loading: () => <div className="flex h-[100dvh] items-center justify-center bg-[#b9c4cb] text-black/50">Opening building site…</div>,
});

export type BuildingShape = "rectangle" | "square" | "wide" | "l-shape" | "t-shape" | "u-shape" | "cross" | "octagon" | "rotunda" | "courtyard";
export type BuilderMaterial = "marble" | "sandstone" | "limestone" | "obsidian";
export type RoofStyle = "flat" | "pyramid" | "dome" | "cone" | "steeple" | "none";

export default function TempleBuilderPage() {
  const [shape, setShape] = useState<BuildingShape | null>(null);
  const [material, setMaterial] = useState<BuilderMaterial>("marble");
  const [width, setWidth] = useState(32);
  const [depth, setDepth] = useState(26);
  const [height, setHeight] = useState(22);
  const [roof, setRoof] = useState<RoofStyle>("pyramid");
  const [levels, setLevels] = useState(1);
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
    setHeight(22);
    setPanel(null);
  };

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-[#b9c4cb] text-white">
      <TempleWorld shape={shape} material={material} width={width} depth={depth} height={height} roof={roof} levels={levels} />

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

      {panel === "edit" && shape && (
        <div className="absolute left-3 right-3 top-[76px] z-30 rounded-3xl bg-[#111820]/95 p-4 shadow-2xl backdrop-blur">
          <div className="mb-3 flex items-center justify-between"><span className="font-semibold">Building</span><button onClick={() => setPanel(null)} className="text-sm text-white/60">Done</button></div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-white/70">Width<input className="mt-2 w-full" type="range" min="16" max="60" value={width} onChange={e=>setWidth(Number(e.target.value))}/></label>
            <label className="text-xs text-white/70">Length<input className="mt-2 w-full" type="range" min="16" max="60" value={depth} onChange={e=>setDepth(Number(e.target.value))}/></label>
            <label className="text-xs text-white/70">Height<input className="mt-2 w-full" type="range" min="12" max="45" value={height} onChange={e=>setHeight(Number(e.target.value))}/></label>
            <label className="text-xs text-white/70">Material<select className="mt-1 w-full rounded-lg bg-white/10 p-2 text-white" value={material} onChange={e=>setMaterial(e.target.value as BuilderMaterial)}><option value="marble">White Marble</option><option value="sandstone">Sandstone</option><option value="limestone">Limestone</option><option value="obsidian">Obsidian</option></select></label>
            <label className="text-xs text-white/70">Levels<select className="mt-1 w-full rounded-lg bg-white/10 p-2 text-white" value={levels} onChange={e=>setLevels(Number(e.target.value))}><option value={1}>1 level</option><option value={2}>2 levels</option><option value={3}>3 levels</option><option value={4}>4 levels</option></select></label>
            <label className="text-xs text-white/70">Roof<select className="mt-1 w-full rounded-lg bg-white/10 p-2 text-white" value={roof} onChange={e=>setRoof(e.target.value as RoofStyle)}><option value="flat">Flat</option><option value="pyramid">Pyramid</option><option value="dome">Dome</option><option value="cone">Cone</option><option value="steeple">Steeple</option><option value="none">No roof</option></select></label>
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 z-30 rounded-t-[28px] border-t border-white/10 bg-[#111820]/95 pb-[max(10px,env(safe-area-inset-bottom))] shadow-2xl backdrop-blur">
        <div className="flex gap-1 overflow-x-auto p-2">
          {(["walls","buildings","fountains","statues","stairs","more"] as const).map((item) => (
            <button key={item} onClick={()=>setPanel(panel===item?null:item)}
              className={`shrink-0 rounded-xl px-4 py-3 text-xs font-medium capitalize ${panel===item ? "bg-amber-200 text-black" : "text-white/65"}`}>
              {item}
            </button>
          ))}
        </div>
        {panel === "buildings" && (
          <div className="flex gap-2 overflow-x-auto border-t border-white/10 px-3 py-3">
            {[["rectangle","Rectangle"],["square","Square"],["wide","Wide Hall"],["l-shape","L Shape"],["t-shape","T Shape"],["u-shape","U Shape"],["cross","Cross"],["octagon","Octagon"],["rotunda","Rotunda"],["courtyard","Courtyard"]].map(([id,name])=>(
              <button key={id} onClick={()=>chooseShape(id as BuildingShape)} className="min-w-[118px] rounded-2xl border border-white/10 bg-white/5 p-3 text-left">
                <div className="mb-2 h-10 rounded-md border-2 border-amber-100/60 bg-amber-100/10"/>
                <div className="text-sm font-medium">{name}</div>
              </button>
            ))}
          </div>
        )}
        {panel && panel !== "buildings" && panel !== "edit" && (
          <div className="border-t border-white/10 px-4 py-4 text-center text-sm text-white/55">
            {panel === "walls" ? "Place individual walls anywhere on the site." :
             panel === "fountains" ? "Place fountains as separate site pieces." :
             panel === "statues" ? "Place statues as separate site pieces." :
             panel === "stairs" ? "Place stairs and entrances." :
             "More separate pieces will live here."}
          </div>
        )}
      </div>
    </main>
  );
}
