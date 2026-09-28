"use client";

import {
  PointerEvent as ReactPointerEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  PIECE_CATEGORIES,
  TEMPLE_MATERIALS,
  createTempleBuild,
  piecesForCategory,
} from "@/lib/temple-builder/catalog";
import type {
  TempleBuild,
  TempleMaterial,
  TemplePiece,
  TemplePieceType,
} from "@/lib/temple-builder/types";

const STORAGE_KEY = "echoes-temple-builder-v2";

type HistoryState = {
  past: TempleBuild[];
  present: TempleBuild;
  future: TempleBuild[];
};

function cloneBuild(build: TempleBuild): TempleBuild {
  return JSON.parse(JSON.stringify(build)) as TempleBuild;
}

function PieceShape({
  piece,
  selected,
  onPointerDown,
}: {
  piece: TemplePiece;
  selected: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  const material =
    TEMPLE_MATERIALS.find((item) => item.id === piece.material) ??
    TEMPLE_MATERIALS[0];

  const commonStyle = {
    left: `${piece.x}%`,
    top: `${piece.y}%`,
    width: `${piece.width}%`,
    height: `${piece.height}%`,
    transform: `translate(-50%, -50%) rotate(${piece.rotation}deg)`,
    zIndex: piece.layer,
  };

  const base = "absolute touch-none border transition-shadow";
  const selectedRing = selected
    ? "ring-2 ring-amber-300 ring-offset-2 ring-offset-transparent"
    : "";

  if (piece.type === "roof" && piece.variant === "roof-pediment") {
    return (
      <button
        type="button"
        aria-label="Temple piece"
        onPointerDown={onPointerDown}
        className={`${base} ${selectedRing} border-black/20`}
        style={{
          ...commonStyle,
          background: material.accent,
          clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
        }}
      />
    );
  }

  if (piece.type === "roof" && piece.variant === "roof-dome") {
    return (
      <button
        type="button"
        aria-label="Temple piece"
        onPointerDown={onPointerDown}
        className={`${base} ${selectedRing} rounded-t-[999px] border-black/20`}
        style={{ ...commonStyle, background: material.surface }}
      />
    );
  }

  if (piece.type === "arch") {
    return (
      <button
        type="button"
        aria-label="Temple piece"
        onPointerDown={onPointerDown}
        className={`${base} ${selectedRing} rounded-t-[999px] border-[5px] bg-transparent`}
        style={{
          ...commonStyle,
          borderColor: material.surface,
          borderBottomColor: "transparent",
        }}
      />
    );
  }

  if (piece.type === "column") {
    return (
      <button
        type="button"
        aria-label="Temple piece"
        onPointerDown={onPointerDown}
        className={`${base} ${selectedRing} rounded-sm border-black/20`}
        style={{
          ...commonStyle,
          background: `linear-gradient(90deg,${material.surface},${material.accent},${material.surface})`,
        }}
      >
        <span
          className="absolute -left-[20%] -right-[20%] top-0 h-[7%] rounded-sm"
          style={{ background: material.accent }}
        />
        <span
          className="absolute -left-[24%] -right-[24%] bottom-0 h-[8%] rounded-sm"
          style={{ background: material.accent }}
        />
      </button>
    );
  }

  if (piece.type === "door") {
    return (
      <button
        type="button"
        aria-label="Temple piece"
        onPointerDown={onPointerDown}
        className={`${base} ${selectedRing} rounded-t-md border-black/40`}
        style={{
          ...commonStyle,
          background: `linear-gradient(90deg,#251812,${material.surface},#251812)`,
        }}
      />
    );
  }

  if (piece.type === "window") {
    return (
      <button
        type="button"
        aria-label="Temple piece"
        onPointerDown={onPointerDown}
        className={`${base} ${selectedRing} ${
          piece.variant === "window-arched" ? "rounded-t-full" : "rounded-sm"
        } border-white/20 bg-slate-950/80`}
        style={commonStyle}
      />
    );
  }

  if (piece.type === "tower" && piece.variant === "tower-round") {
    return (
      <button
        type="button"
        aria-label="Temple piece"
        onPointerDown={onPointerDown}
        className={`${base} ${selectedRing} rounded-t-[45%] border-black/20`}
        style={{
          ...commonStyle,
          background: `linear-gradient(90deg,${material.surface},${material.accent},${material.surface})`,
        }}
      />
    );
  }

  return (
    <button
      type="button"
      aria-label="Temple piece"
      onPointerDown={onPointerDown}
      className={`${base} ${selectedRing} rounded-sm border-black/20`}
      style={{
        ...commonStyle,
        background: piece.type === "floor" ? material.accent : material.surface,
      }}
    />
  );
}

export default function TempleBuilderPage() {
  const [history, setHistory] = useState<HistoryState>(() => ({
    past: [],
    present: createTempleBuild(),
    future: [],
  }));
  const [activeCategory, setActiveCategory] =
    useState<TemplePieceType>("wall");
  const [pendingVariant, setPendingVariant] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState("Choose a piece, then tap the build area.");
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    pieceX: number;
    pieceY: number;
    before: TempleBuild;
  } | null>(null);

  const build = history.present;
  const selectedPiece = useMemo(
    () => build.pieces.find((piece) => piece.id === selectedId) ?? null,
    [build.pieces, selectedId]
  );
  const categoryPieces = useMemo(
    () => piecesForCategory(activeCategory),
    [activeCategory]
  );

  const commit = (next: TempleBuild) => {
    setHistory((current) => ({
      past: [...current.past, cloneBuild(current.present)].slice(-40),
      present: next,
      future: [],
    }));
  };

  const updateSelected = (patch: Partial<TemplePiece>) => {
    if (!selectedId) return;
    const next = cloneBuild(build);
    next.pieces = next.pieces.map((piece) =>
      piece.id === selectedId ? { ...piece, ...patch } : piece
    );
    commit(next);
    setStatus("Piece updated.");
  };

  const placePendingPiece = (clientX: number, clientY: number) => {
    if (!pendingVariant || !stageRef.current) return;

    const definition = categoryPieces.find(
      (piece) => piece.id === pendingVariant
    );
    if (!definition) return;

    const rect = stageRef.current.getBoundingClientRect();
    const x = Math.max(3, Math.min(97, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(3, Math.min(97, ((clientY - rect.top) / rect.height) * 100));
    const newPiece: TemplePiece = {
      id: `${definition.id}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,
      type: definition.type,
      variant: definition.id,
      material: build.defaultMaterial,
      x,
      y,
      width: definition.width,
      height: definition.height,
      rotation: 0,
      layer: build.pieces.length + 1,
    };

    const next = cloneBuild(build);
    next.pieces.push(newPiece);
    commit(next);
    setSelectedId(newPiece.id);
    setPendingVariant(null);
    setStatus("Placed. Drag it to fine-tune.");
  };

  const handleStagePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pendingVariant) {
      placePendingPiece(event.clientX, event.clientY);
      return;
    }
    setSelectedId(null);
  };

  const beginDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    piece: TemplePiece
  ) => {
    event.stopPropagation();
    setSelectedId(piece.id);
    dragRef.current = {
      id: piece.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      pieceX: piece.x,
      pieceY: piece.y,
      before: cloneBuild(build),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !stageRef.current) return;

    const rect = stageRef.current.getBoundingClientRect();
    const dx = ((event.clientX - drag.startX) / rect.width) * 100;
    const dy = ((event.clientY - drag.startY) / rect.height) * 100;

    setHistory((current) => ({
      ...current,
      present: {
        ...current.present,
        pieces: current.present.pieces.map((piece) =>
          piece.id === drag.id
            ? {
                ...piece,
                x: Math.max(2, Math.min(98, drag.pieceX + dx)),
                y: Math.max(2, Math.min(98, drag.pieceY + dy)),
              }
            : piece
        ),
      },
    }));
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setHistory((current) => ({
      past: [...current.past, drag.before].slice(-40),
      present: current.present,
      future: [],
    }));
    setStatus("Piece moved.");
  };

  const duplicateSelected = () => {
    if (!selectedPiece) return;
    const copy: TemplePiece = {
      ...selectedPiece,
      id: `${selectedPiece.variant}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,
      x: Math.min(94, selectedPiece.x + 5),
      y: Math.min(94, selectedPiece.y + 5),
      layer: build.pieces.length + 1,
    };
    const next = cloneBuild(build);
    next.pieces.push(copy);
    commit(next);
    setSelectedId(copy.id);
    setStatus("Piece duplicated.");
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    const next = cloneBuild(build);
    next.pieces = next.pieces.filter((piece) => piece.id !== selectedId);
    commit(next);
    setSelectedId(null);
    setStatus("Piece deleted.");
  };

  const undo = () => {
    setHistory((current) => {
      if (!current.past.length) return current;
      const previous = current.past[current.past.length - 1];
      return {
        past: current.past.slice(0, -1),
        present: cloneBuild(previous),
        future: [cloneBuild(current.present), ...current.future],
      };
    });
    setSelectedId(null);
    setStatus("Undo.");
  };

  const redo = () => {
    setHistory((current) => {
      if (!current.future.length) return current;
      const next = current.future[0];
      return {
        past: [...current.past, cloneBuild(current.present)],
        present: cloneBuild(next),
        future: current.future.slice(1),
      };
    });
    setSelectedId(null);
    setStatus("Redo.");
  };

  const save = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(build));
    setStatus("Saved on this device.");
  };

  const load = () => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setStatus("No saved temple found.");
      return;
    }
    try {
      const saved = JSON.parse(raw) as TempleBuild;
      if (saved.version !== 2) throw new Error("Old format");
      setHistory({ past: [], present: saved, future: [] });
      setSelectedId(null);
      setStatus("Saved temple loaded.");
    } catch {
      setStatus("Saved temple could not be loaded.");
    }
  };

  const reset = () => {
    setHistory({ past: [], present: createTempleBuild(), future: [] });
    setSelectedId(null);
    setPendingVariant(null);
    setStatus("Builder cleared.");
  };

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/20 px-3 py-3 sm:px-5">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.28em] text-amber-200/60">
              Echoes
            </div>
            <input
              value={build.name}
              onChange={(event) =>
                setHistory((current) => ({
                  ...current,
                  present: { ...current.present, name: event.target.value },
                }))
              }
              className="w-full truncate bg-transparent text-lg font-semibold outline-none"
            />
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              onClick={undo}
              disabled={!history.past.length}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm disabled:opacity-30"
            >
              Undo
            </button>
            <button
              onClick={redo}
              disabled={!history.future.length}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm disabled:opacity-30"
            >
              Redo
            </button>
            <button
              onClick={save}
              className="rounded-xl bg-amber-200 px-4 py-2 text-sm font-semibold text-black"
            >
              Save
            </button>
          </div>
        </header>

        <section className="flex flex-1 flex-col gap-3 p-3 sm:p-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/60">
            {status}
          </div>

          <div
            ref={stageRef}
            onPointerDown={handleStagePointerDown}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className={`relative min-h-[54vh] flex-1 overflow-hidden rounded-3xl border ${
              pendingVariant
                ? "cursor-crosshair border-amber-300/50"
                : "border-white/10"
            } bg-[radial-gradient(circle_at_50%_22%,rgba(120,140,180,0.28),transparent_36%),linear-gradient(180deg,#111827_0%,#202938_55%,#0f1720_100%)] shadow-2xl`}
          >
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[27%] bg-[linear-gradient(180deg,#29392d,#172019)]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-[26%] border-t border-dashed border-white/10" />

            {build.pieces.map((piece) => (
              <PieceShape
                key={piece.id}
                piece={piece}
                selected={piece.id === selectedId}
                onPointerDown={(event) => beginDrag(event, piece)}
              />
            ))}

            {!build.pieces.length && !pendingVariant && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8 text-center text-sm text-white/35">
                Choose one of the eight categories below to start building.
              </div>
            )}

            {pendingVariant && (
              <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-amber-200 px-4 py-2 text-xs font-semibold text-black shadow-xl">
                Tap where you want to place it
              </div>
            )}
          </div>

          {selectedPiece && (
            <div className="rounded-2xl border border-amber-200/25 bg-amber-200/[0.06] p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                    Selected
                  </div>
                  <div className="font-medium capitalize">
                    {selectedPiece.variant.replaceAll("-", " ")}
                  </div>
                </div>
                <button
                  onClick={deleteSelected}
                  className="rounded-xl border border-red-300/20 px-3 py-2 text-sm text-red-200"
                >
                  Delete
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <label className="rounded-xl border border-white/10 bg-black/20 p-2 text-xs">
                  Width
                  <input
                    type="range"
                    min="4"
                    max="70"
                    value={selectedPiece.width}
                    onChange={(event) =>
                      updateSelected({ width: Number(event.target.value) })
                    }
                    className="mt-2 w-full"
                  />
                </label>

                <label className="rounded-xl border border-white/10 bg-black/20 p-2 text-xs">
                  Height
                  <input
                    type="range"
                    min="4"
                    max="70"
                    value={selectedPiece.height}
                    onChange={(event) =>
                      updateSelected({ height: Number(event.target.value) })
                    }
                    className="mt-2 w-full"
                  />
                </label>

                <label className="rounded-xl border border-white/10 bg-black/20 p-2 text-xs">
                  Rotation
                  <input
                    type="range"
                    min="-45"
                    max="45"
                    value={selectedPiece.rotation}
                    onChange={(event) =>
                      updateSelected({ rotation: Number(event.target.value) })
                    }
                    className="mt-2 w-full"
                  />
                </label>

                <label className="rounded-xl border border-white/10 bg-black/20 p-2 text-xs">
                  Material
                  <select
                    value={selectedPiece.material}
                    onChange={(event) =>
                      updateSelected({
                        material: event.target.value as TempleMaterial,
                      })
                    }
                    className="mt-2 w-full bg-[#111827] text-xs"
                  >
                    {TEMPLE_MATERIALS.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.name}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  onClick={duplicateSelected}
                  className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm"
                >
                  Duplicate
                </button>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
            <div className="flex gap-1 overflow-x-auto p-2">
              {PIECE_CATEGORIES.map((category) => (
                <button
                  key={category.type}
                  onClick={() => {
                    setActiveCategory(category.type);
                    setPendingVariant(null);
                  }}
                  className={`shrink-0 rounded-xl px-3 py-2 text-sm ${
                    activeCategory === category.type
                      ? "bg-amber-200 font-semibold text-black"
                      : "bg-black/25 text-white/70"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            <div className="border-t border-white/10 p-3">
              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                Choose a piece
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {categoryPieces.map((piece) => (
                  <button
                    key={piece.id}
                    onClick={() => {
                      setPendingVariant(piece.id);
                      setSelectedId(null);
                      setStatus(`${piece.name} selected. Tap the build area to place it.`);
                    }}
                    className={`min-w-[130px] rounded-2xl border px-3 py-3 text-left ${
                      pendingVariant === piece.id
                        ? "border-amber-300 bg-amber-200/10"
                        : "border-white/10 bg-black/20"
                    }`}
                  >
                    <div className="font-medium">{piece.name}</div>
                    <div className="mt-1 text-xs text-white/40">
                      {piece.width} × {piece.height}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/60">
              New pieces
              <select
                value={build.defaultMaterial}
                onChange={(event) =>
                  setHistory((current) => ({
                    ...current,
                    present: {
                      ...current.present,
                      defaultMaterial: event.target.value as TempleMaterial,
                    },
                  }))
                }
                className="bg-[#111827] text-white"
              >
                {TEMPLE_MATERIALS.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex gap-2">
              <button
                onClick={load}
                className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70"
              >
                Load
              </button>
              <button
                onClick={reset}
                className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/50"
              >
                Clear
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
