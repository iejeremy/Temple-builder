"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { TEMPLE_MATERIALS, createTempleBuild } from "@/lib/temple-builder/catalog";
import type { TempleBuild, TempleMaterial, TemplePiece } from "@/lib/temple-builder/types";

const TempleWorld = dynamic(() => import("@/components/Temple3DPreview"), {
  ssr: false,
  loading: () => <div className="flex min-h-[72vh] items-center justify-center bg-[#111820] text-white/50">Opening the building site…</div>,
});

const STORAGE_KEY = "echoes-temple-builder-v3";
type Tool = "buildings" | "doors" | "windows" | "details";

const SHAPES = [
  { id: "building-rectangle", name: "Rectangle", width: 34, depth: 26, height: 24 },
  { id: "building-square", name: "Square", width: 28, depth: 28, height: 24 },
  { id: "building-wide", name: "Wide Hall", width: 46, depth: 24, height: 22 },
];

function freshPiece(shape: (typeof SHAPES)[number], material: TempleMaterial, index: number): TemplePiece {
  return {
    id: `${shape.id}-${Date.now()}-${index}`,
    type: "wall",
    variant: shape.id,
    material,
    x: 50 + Math.min(index * 4, 18),
    y: 50 + Math.min(index * 4, 18),
    width: shape.width,
    height: shape.depth,
    wallHeight: shape.height,
    rotation: 0,
    layer: index + 1,
  };
}

export default function TempleBuilderPage() {
  const [build, setBuild] = useState<TempleBuild>(() => createTempleBuild());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>("buildings");
  const [trayOpen, setTrayOpen] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<TempleBuild>;
      if (
        saved.version === 2 &&
        Array.isArray(saved.pieces) &&
        saved.pieces.every((piece) =>
          piece &&
          typeof piece.id === "string" &&
          typeof piece.type === "string" &&
          typeof piece.width === "number" &&
          typeof piece.height === "number"
        )
      ) {
        setBuild(saved as TempleBuild);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const selected = useMemo(
    () => build.pieces.find((piece) => piece.id === selectedId) ?? null,
    [build.pieces, selectedId]
  );

  const updateSelected = (patch: Partial<TemplePiece>) => {
    if (!selectedId) return;
    setBuild((current) => ({
      ...current,
      pieces: current.pieces.map((piece) => piece.id === selectedId ? { ...piece, ...patch } : piece),
    }));
  };

  const addBuilding = (shape: (typeof SHAPES)[number]) => {
    setBuild((current) => {
      const piece = freshPiece(shape, current.defaultMaterial, current.pieces.length);
      setSelectedId(piece.id);
      return { ...current, pieces: [...current.pieces, piece] };
    });
    setTrayOpen(false);
  };

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(build));
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setBuild((current) => ({ ...current, pieces: current.pieces.filter((p) => p.id !== selectedId) }));
    setSelectedId(null);
  };

  return (
    <main className="h-[100dvh] overflow-hidden bg-[#0d1319] text-white">
      <div className="relative h-full w-full">
        <TempleWorld
          build={build}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMove={(id, x, y) => setBuild((current) => ({
            ...current,
            pieces: current.pieces.map((p) => p.id === id ? { ...p, x, y } : p),
          }))}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-3">
          <div className="pointer-events-auto rounded-2xl bg-black/55 px-4 py-2 backdrop-blur">
            <div className="text-[10px] uppercase tracking-[0.24em] text-amber-200/70">Echoes</div>
            <div className="text-sm font-semibold">Temple Builder</div>
          </div>
          <button onClick={save} className="pointer-events-auto rounded-2xl bg-amber-200 px-4 py-3 text-sm font-semibold text-black shadow-lg">Save</button>
        </div>

        {!build.pieces.length && (
          <div className="pointer-events-none absolute inset-x-5 top-[18%] z-10 rounded-3xl bg-black/45 p-5 text-center backdrop-blur-sm">
            <div className="text-xl font-semibold">Your building site</div>
            <div className="mt-1 text-sm text-white/70">Choose a building shape below. It will appear directly on the ground.</div>
          </div>
        )}

        {selected && (
          <div className="absolute left-3 right-3 top-[72px] z-20 rounded-2xl border border-white/10 bg-black/65 p-3 shadow-xl backdrop-blur">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">Edit building</span>
              <button onClick={() => setSelectedId(null)} className="rounded-lg px-2 py-1 text-xs text-white/60">Done</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="rounded-xl bg-white/5 p-2 text-xs">Height
                <input className="mt-1 w-full" type="range" min="10" max="55" value={selected.wallHeight ?? 22}
                  onChange={(e) => updateSelected({ wallHeight: Number(e.target.value) })} />
              </label>
              <label className="rounded-xl bg-white/5 p-2 text-xs">Material
                <select className="mt-1 w-full bg-[#151c23] p-1" value={selected.material}
                  onChange={(e) => updateSelected({ material: e.target.value as TempleMaterial })}>
                  {TEMPLE_MATERIALS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
              <label className="rounded-xl bg-white/5 p-2 text-xs">Width
                <input className="mt-1 w-full" type="range" min="12" max="65" value={selected.width}
                  onChange={(e) => updateSelected({ width: Number(e.target.value) })} />
              </label>
              <label className="rounded-xl bg-white/5 p-2 text-xs">Length
                <input className="mt-1 w-full" type="range" min="12" max="65" value={selected.height}
                  onChange={(e) => updateSelected({ height: Number(e.target.value) })} />
              </label>
            </div>
            <button onClick={removeSelected} className="mt-2 w-full rounded-xl border border-red-300/20 py-2 text-xs text-red-200">Remove building</button>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 z-30 rounded-t-[28px] border-t border-white/10 bg-[#111820]/95 pb-[max(10px,env(safe-area-inset-bottom))] shadow-2xl backdrop-blur">
          <div className="grid grid-cols-4 gap-1 p-2">
            {([
              ["buildings", "Buildings"],
              ["doors", "Doors"],
              ["windows", "Windows"],
              ["details", "Details"],
            ] as const).map(([id, label]) => (
              <button key={id} onClick={() => { setTool(id); setTrayOpen(true); }}
                className={`rounded-xl px-1 py-3 text-xs font-medium ${tool === id ? "bg-amber-200 text-black" : "text-white/65"}`}>
                {label}
              </button>
            ))}
          </div>

          {trayOpen && (
            <div className="border-t border-white/10 px-3 pb-2 pt-3">
              {tool === "buildings" ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {SHAPES.map((shape) => (
                    <button key={shape.id} onClick={() => addBuilding(shape)}
                      className="min-w-[120px] rounded-2xl border border-white/10 bg-white/5 p-3 text-left">
                      <div className="mb-3 h-14 rounded-lg border-2 border-amber-100/60 bg-amber-100/10"
                        style={{ aspectRatio: `${shape.width}/${shape.depth}` }} />
                      <div className="text-sm font-medium">{shape.name}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-sm text-white/50">
                  {tool === "doors" ? "Tap a building first, then we’ll place doors on its walls." :
                   tool === "windows" ? "Tap a building first, then we’ll place windows on its walls." :
                   "Columns, arches, roofs and trim will live here."}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
