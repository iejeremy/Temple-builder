"use client";

import dynamic from "next/dynamic";
import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
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

const Temple3DPreview = dynamic(
  () => import("@/components/Temple3DPreview"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[54vh] items-center justify-center rounded-3xl border border-white/10 bg-[#0b1020] text-sm text-white/50">
        Loading 3D preview…
      </div>
    ),
  }
);

const STORAGE_KEY = "echoes-temple-builder-v2";
const SNAP_DISTANCE = 6;
const HISTORY_LIMIT = 40;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function cloneBuild(build: TempleBuild): TempleBuild {
  return JSON.parse(JSON.stringify(build)) as TempleBuild;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function distance(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

function wallEndpoints(piece: TemplePiece) {
  const angle = (piece.rotation * Math.PI) / 180;
  const dx = Math.cos(angle) * (piece.width / 2);
  const dy = Math.sin(angle) * (piece.width / 2);
  return [
    { x: piece.x - dx, y: piece.y - dy },
    { x: piece.x + dx, y: piece.y + dy },
  ];
}

type SnapPoint = {
  x: number;
  y: number;
  key: string;
  label: string;
  rotation?: number;
};

type Guide = SnapPoint & {
  width: number;
  height: number;
};

function nearestSnap(
  piece: TemplePiece,
  proposedX: number,
  proposedY: number,
  pieces: TemplePiece[]
): SnapPoint | null {
  const others = pieces.filter((candidate) => candidate.id !== piece.id);
  const candidates: SnapPoint[] = [];

  if (piece.type === "wall") {
    for (const target of others.filter((c) => c.type === "wall")) {
      candidates.push(
        {
          x: target.x - target.width / 2 - piece.width / 2,
          y: target.y,
          rotation: target.rotation,
          key: `room-${target.id}-left`,
          label: "Room edge",
        },
        {
          x: target.x + target.width / 2 + piece.width / 2,
          y: target.y,
          rotation: target.rotation,
          key: `room-${target.id}-right`,
          label: "Room edge",
        },
        {
          x: target.x,
          y: target.y - target.height / 2 - piece.height / 2,
          rotation: target.rotation,
          key: `room-${target.id}-top`,
          label: "Room edge",
        },
        {
          x: target.x,
          y: target.y + target.height / 2 + piece.height / 2,
          rotation: target.rotation,
          key: `room-${target.id}-bottom`,
          label: "Room edge",
        }
      );
    }
    for (const floor of others.filter((c) => c.type === "floor")) {
      candidates.push({
        x: floor.x,
        y: floor.y,
        key: `room-floor-${floor.id}`,
        label: "Floor center",
      });
    }
  }

  if (piece.type === "door" || piece.type === "window") {
    for (const wall of others.filter((c) => c.type === "wall")) {
      const angle = (wall.rotation * Math.PI) / 180;
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);
      const relX = proposedX - wall.x;
      const relY = proposedY - wall.y;
      const projected = relX * dirX + relY * dirY;
      const maxTravel = Math.max(0, wall.width / 2 - piece.width / 2);
      const travel = clamp(projected, -maxTravel, maxTravel);
      candidates.push({
        x: wall.x + dirX * travel,
        y: wall.y + dirY * travel,
        rotation: wall.rotation,
        key: `\( {piece.type}-wall- \){wall.id}`,
        label: piece.type === "door" ? "Door in wall" : "Window in wall",
      });
    }
  }

  if (piece.type === "floor") {
    for (const floor of others.filter((c) => c.type === "floor")) {
      candidates.push(
        {
          x: floor.x - floor.width / 2 - piece.width / 2,
          y: floor.y,
          key: `floor-${floor.id}-left`,
          label: "Floor edge",
        },
        {
          x: floor.x + floor.width / 2 + piece.width / 2,
          y: floor.y,
          key: `floor-${floor.id}-right`,
          label: "Floor edge",
        }
      );
    }
  }

  if (piece.type === "tower") {
    for (const floor of others.filter((c) => c.type === "floor")) {
      const y = floor.y - floor.height / 2 - piece.height / 2;
      candidates.push(
        {
          x: floor.x - floor.width / 2 + piece.width / 2,
          y,
          key: `tower-floor-${floor.id}-left`,
          label: "Floor corner",
        },
        {
          x: floor.x + floor.width / 2 - piece.width / 2,
          y,
          key: `tower-floor-${floor.id}-right`,
          label: "Floor corner",
        }
      );
    }
    for (const wall of others.filter((c) => c.type === "wall")) {
      wallEndpoints(wall).forEach((end, index) => {
        candidates.push({
          x: end.x,
          y: end.y - piece.height / 2,
          key: `tower-wall-\( {wall.id}- \){index}`,
          label: "Wall end",
        });
      });
    }
  }

  if (piece.type === "column") {
    for (const floor of others.filter((c) => c.type === "floor")) {
      const left = floor.x - floor.width / 2 + piece.width / 2;
      const right = floor.x + floor.width / 2 - piece.width / 2;
      const y = floor.y - floor.height / 2 - piece.height / 2;
      for (let index = 0; index < 5; index += 1) {
        const x = left + ((right - left) * index) / 4;
        candidates.push({
          x,
          y,
          key: `column-grid-\( {floor.id}- \){index}`,
          label: "Column spacing",
        });
      }
    }
    for (const column of others.filter((c) => c.type === "column")) {
      candidates.push({
        x: 100 - column.x,
        y: column.y,
        key: `column-mirror-${column.id}`,
        label: "Mirror alignment",
      });
    }
  }

  if (piece.type === "arch") {
    const supports = others.filter(
      (c) => c.type === "column" || c.type === "wall"
    );
    for (let first = 0; first < supports.length; first += 1) {
      for (let second = first + 1; second < supports.length; second += 1) {
        const a = supports[first];
        const b = supports[second];
        const gap = distance(a.x, a.y, b.x, b.y);
        if (gap <= 45 && Math.abs(a.y - b.y) <= 10) {
          candidates.push({
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2,
            key: `arch-between-\( {a.id}- \){b.id}`,
            label: "Between supports",
          });
        }
      }
    }
  }

  if (piece.type === "roof") {
    for (const target of others.filter(
      (c) => c.type === "wall" || c.type === "tower"
    )) {
      candidates.push({
        x: target.x,
        y: target.y - target.height / 2 - piece.height / 2,
        key: `roof-${target.id}`,
        label: target.type === "tower" ? "Tower top" : "Wall top",
        rotation: target.rotation,
      });
    }
  }

  for (const target of others.filter((c) => c.type === piece.type)) {
    candidates.push(
      {
        x: target.x,
        y: proposedY,
        key: `align-x-${target.id}`,
        label: "Vertical alignment",
      },
      {
        x: proposedX,
        y: target.y,
        key: `align-y-${target.id}`,
        label: "Horizontal alignment",
      }
    );
  }

  let best: { point: SnapPoint; score: number } | null = null;
  for (const point of candidates) {
    const score = distance(proposedX, proposedY, point.x, point.y);
    if (score <= SNAP_DISTANCE && (!best || score < best.score)) {
      best = { point, score };
    }
  }
  return best?.point ?? null;
}

/* ------------------------------------------------------------------ */
/*  History                                                            */
/* ------------------------------------------------------------------ */

type HistoryState = {
  past: TempleBuild[];
  present: TempleBuild;
  future: TempleBuild[];
};

function useTempleHistory(initial: TempleBuild) {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initial,
    future: [],
  });

  const commit = useCallback((next: TempleBuild) => {
    setHistory((h) => ({
      past: [...h.past, cloneBuild(h.present)].slice(-HISTORY_LIMIT),
      present: next,
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.past.length) return h;
      const previous = h.past[h.past.length - 1];
      return {
        past: h.past.slice(0, -1),
        present: cloneBuild(previous),
        future: [cloneBuild(h.present), ...h.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (!h.future.length) return h;
      const next = h.future[0];
      return {
        past: [...h.past, cloneBuild(h.present)],
        present: cloneBuild(next),
        future: h.future.slice(1),
      };
    });
  }, []);

  const replacePresent = useCallback((next: TempleBuild) => {
    setHistory((h) => ({ ...h, present: next }));
  }, []);

  return {
    build: history.present,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    commit,
    undo,
    redo,
    replacePresent,
    setHistory,
  };
}

/* ------------------------------------------------------------------ */
/*  PieceShape                                                         */
/* ------------------------------------------------------------------ */

const PieceShape = memo(function PieceShape({
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

  if (piece.type === "wall") {
    return (
      <button
        type="button"
        aria-label="Temple wall room"
        onPointerDown={onPointerDown}
        className={`${base} ${selectedRing} border-2 border-amber-100/90 bg-amber-100/5 shadow-inner`}
        style={{
          ...commonStyle,
          backgroundImage:
            "linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px)",
          backgroundSize: "12px 12px",
        }}
      >
        <span className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/75 px-2 py-0.5 text-[9px] text-amber-100">
          {Math.round(piece.width)} × {Math.round(piece.height)}
        </span>
      </button>
    );
  }

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
          background: `linear-gradient(90deg,\( {material.surface}, \){material.accent},${material.surface})`,
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
          background: `linear-gradient(90deg,\( {material.surface}, \){material.accent},${material.surface})`,
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
});

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TempleBuilderPage() {
  const {
    build,
    canUndo,
    canRedo,
    commit,
    undo,
    redo,
    replacePresent,
    setHistory,
  } = useTempleHistory(createTempleBuild());

  const [activeCategory, setActiveCategory] =
    useState<TemplePieceType>("wall");
  const [pendingVariant, setPendingVariant] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState(
    "Choose a piece, then tap the build area."
  );
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [viewMode, setViewMode] = useState<"build" | "3d">("build");
  const [snapGuide, setSnapGuide] = useState<Guide | null>(null);
  const [pendingGuide, setPendingGuide] = useState<Guide | null>(null);
  const [dirty, setDirty] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const lastSnapKeyRef = useRef<string | null>(null);

  const dragRef = useRef<{
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    pieceX: number;
    pieceY: number;
    before: TempleBuild;
  } | null>(null);

  const resizeRef = useRef<{
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    startWidth: number;
    startDepth: number;
    startXPos: number;
    startYPos: number;
    corner: "nw" | "ne" | "sw" | "se";
    before: TempleBuild;
  } | null>(null);

  const selectedPiece = useMemo(
    () => build.pieces.find((piece) => piece.id === selectedId) ?? null,
    [build.pieces, selectedId]
  );

  const categoryPieces = useMemo(
    () => piecesForCategory(activeCategory),
    [activeCategory]
  );

  const pulseSnap = useCallback((key: string) => {
    if (lastSnapKeyRef.current === key) return;
    lastSnapKeyRef.current = key;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(18);
    }
  }, []);

  const updateSelected = useCallback(
    (patch: Partial<TemplePiece>) => {
      if (!selectedId) return;
      const next = cloneBuild(build);
      next.pieces = next.pieces.map((piece) =>
        piece.id === selectedId ? { ...piece, ...patch } : piece
      );
      commit(next);
      setDirty(true);
      setStatus("Piece updated.");
    },
    [selectedId, build, commit]
  );

  const pointFromClient = useCallback((clientX: number, clientY: number) => {
    if (!stageRef.current) return null;
    const rect = stageRef.current.getBoundingClientRect();
    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100, 2, 98),
      y: clamp(((clientY - rect.top) / rect.height) * 100, 2, 98),
    };
  }, []);

  const createPendingPiece = useCallback(
    (x: number, y: number) => {
      if (!pendingVariant) return null;
      const definition = categoryPieces.find(
        (piece) => piece.id === pendingVariant
      );
      if (!definition) return null;
      return {
        id: "__pending__",
        type: definition.type,
        variant: definition.id,
        material: build.defaultMaterial,
        x,
        y,
        width: definition.width,
        height: definition.height,
        wallHeight: definition.wallHeight,
        rotation: 0,
        layer: build.pieces.length + 1,
      } satisfies TemplePiece;
    },
    [pendingVariant, categoryPieces, build.defaultMaterial, build.pieces.length]
  );

  const resolvePosition = useCallback(
    (
      piece: TemplePiece,
      proposedX: number,
      proposedY: number,
      pieces: TemplePiece[]
    ) => {
      if (!snapEnabled) {
        return {
          x: proposedX,
          y: proposedY,
          rotation: piece.rotation,
          snap: null as SnapPoint | null,
        };
      }
      const snap = nearestSnap(piece, proposedX, proposedY, pieces);
      if (!snap) {
        return {
          x: proposedX,
          y: proposedY,
          rotation: piece.rotation,
          snap: null,
        };
      }
      return {
        x: clamp(snap.x, 2, 98),
        y: clamp(snap.y, 2, 98),
        rotation: snap.rotation ?? piece.rotation,
        snap,
      };
    },
    [snapEnabled]
  );

  const placePendingPiece = useCallback(
    (clientX: number, clientY: number) => {
      const point = pointFromClient(clientX, clientY);
      if (!point) return;

      const draft = createPendingPiece(point.x, point.y);
      if (!draft) return;

      const resolved = resolvePosition(draft, point.x, point.y, build.pieces);

      const newPiece: TemplePiece = {
        ...draft,
        id: `\( {draft.variant}- \){Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}`,
        x: resolved.x,
        y: resolved.y,
        rotation: resolved.rotation,
      };

      const next = cloneBuild(build);
      next.pieces.push(newPiece);
      commit(next);
      setDirty(true);
      setSelectedId(newPiece.id);
      setPendingVariant(null);
      setPendingGuide(null);
      setSnapGuide(null);

      if (resolved.snap) {
        pulseSnap(resolved.snap.key);
        setStatus(
          newPiece.type === "wall"
            ? `Wall room placed: ${resolved.snap.label}. Pull a corner to reshape it.`
            : `Snapped: ${resolved.snap.label}. Drag to fine-tune.`
        );
      } else {
        setStatus(
          newPiece.type === "wall"
            ? "Wall room placed. Pull a corner to reshape it."
            : "Placed. Drag it to fine-tune."
        );
      }
    },
    [
      pointFromClient,
      createPendingPiece,
      resolvePosition,
      build,
      commit,
      pulseSnap,
    ]
  );

          <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/60">
              New pieces
              <select
                value={build.defaultMaterial}
                onChange={(event) => {
                  replacePresent({
                    ...build,
                    defaultMaterial: event.target.value as TempleMaterial,
                  });
                  setDirty(true);
                }}
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
   
