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

  const drawWallRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    variant: string;
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
        id: `${draft.variant}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
      setStatus("Piece placed.");
    },
    [pointFromClient, createPendingPiece, resolvePosition, build, commit]
  );

  const handleStagePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pendingVariant && activeCategory === "wall") {
        const point = pointFromClient(event.clientX, event.clientY);
        if (!point) return;
        drawWallRef.current = {
          pointerId: event.pointerId,
          startX: point.x,
          startY: point.y,
          variant: pendingVariant,
          before: cloneBuild(build),
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        setPendingGuide({
          x: point.x,
          y: point.y,
          width: 2,
          height: 2,
          key: "draw-wall",
          label: "Pull to size",
          rotation: 0,
        });
        setStatus("Pull to set the room width and length, then release.");
        return;
      }

      if (pendingVariant) {
        placePendingPiece(event.clientX, event.clientY);
        return;
      }
      setSelectedId(null);
    },
    [pendingVariant, activeCategory, pointFromClient, build, placePendingPiece]
  );

  const beginDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, piece: TemplePiece) => {
      event.stopPropagation();
      setPendingVariant(null);
      setPendingGuide(null);
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
    },
    [build]
  );

  const moveWallResize = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const resize = resizeRef.current;
      if (!resize || resize.pointerId !== event.pointerId || !stageRef.current)
        return;

      const rect = stageRef.current.getBoundingClientRect();
      const dx = ((event.clientX - resize.startX) / rect.width) * 100;
      const dy = ((event.clientY - resize.startY) / rect.height) * 100;

      const widthDelta =
        resize.corner === "nw" || resize.corner === "sw" ? -dx : dx;
      const depthDelta =
        resize.corner === "nw" || resize.corner === "ne" ? -dy : dy;

      const newWidth = clamp(resize.startWidth + widthDelta * 2, 10, 90);
      const newHeight = clamp(resize.startDepth + depthDelta * 2, 10, 90);

      let newX = resize.startXPos;
      let newY = resize.startYPos;

      if (resize.corner === "nw") {
        newX = resize.startXPos - (newWidth - resize.startWidth) / 2;
        newY = resize.startYPos - (newHeight - resize.startDepth) / 2;
      } else if (resize.corner === "ne") {
        newX = resize.startXPos + (newWidth - resize.startWidth) / 2;
        newY = resize.startYPos - (newHeight - resize.startDepth) / 2;
      } else if (resize.corner === "sw") {
        newX = resize.startXPos - (newWidth - resize.startWidth) / 2;
        newY = resize.startYPos + (newHeight - resize.startDepth) / 2;
      } else {
        newX = resize.startXPos + (newWidth - resize.startWidth) / 2;
        newY = resize.startYPos + (newHeight - resize.startDepth) / 2;
      }

      replacePresent({
        ...build,
        pieces: build.pieces.map((piece) =>
          piece.id === resize.id
            ? {
                ...piece,
                width: newWidth,
                height: newHeight,
                x: clamp(newX, 2, 98),
                y: clamp(newY, 2, 98),
              }
            : piece
        ),
      });
      setStatus("Resizing wall room.");
    },
    [build, replacePresent]
  );

  const handleStagePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drawing = drawWallRef.current;
      if (drawing && drawing.pointerId === event.pointerId) {
        const point = pointFromClient(event.clientX, event.clientY);
        if (!point) return;
        const minX = Math.min(drawing.startX, point.x);
        const maxX = Math.max(drawing.startX, point.x);
        const minY = Math.min(drawing.startY, point.y);
        const maxY = Math.max(drawing.startY, point.y);
        const grid = 2;
        const width = Math.max(6, Math.round((maxX - minX) / grid) * grid);
        const height = Math.max(6, Math.round((maxY - minY) / grid) * grid);
        setPendingGuide({
          x: clamp((minX + maxX) / 2, 2, 98),
          y: clamp((minY + maxY) / 2, 2, 98),
          width,
          height,
          key: "draw-wall",
          label: `${width} × ${height} — release to snap`,
          rotation: 0,
        });
        return;
      }

      if (resizeRef.current) {
        moveWallResize(event);
        return;
      }

      const drag = dragRef.current;

      if (!drag) {
        if (!pendingVariant) {
          setPendingGuide(null);
          return;
        }
        const point = pointFromClient(event.clientX, event.clientY);
        if (!point) return;
        const draft = createPendingPiece(point.x, point.y);
        if (!draft) return;
        const resolved = resolvePosition(
          draft,
          point.x,
          point.y,
          build.pieces
        );
        setPendingGuide({
          x: resolved.x,
          y: resolved.y,
          width: draft.width,
          height: draft.height,
          key: resolved.snap?.key ?? "free-pending",
          label: resolved.snap?.label ?? "Place here",
          rotation: resolved.rotation,
        });
        return;
      }

      if (drag.pointerId !== event.pointerId || !stageRef.current) return;

      const rect = stageRef.current.getBoundingClientRect();
      const dx = ((event.clientX - drag.startX) / rect.width) * 100;
      const dy = ((event.clientY - drag.startY) / rect.height) * 100;
      const proposedX = clamp(drag.pieceX + dx, 2, 98);
      const proposedY = clamp(drag.pieceY + dy, 2, 98);
      const movingPiece = build.pieces.find((piece) => piece.id === drag.id);
      if (!movingPiece) return;

      const resolved = resolvePosition(
        movingPiece,
        proposedX,
        proposedY,
        build.pieces
      );

      replacePresent({
        ...build,
        pieces: build.pieces.map((piece) =>
          piece.id === drag.id
            ? {
                ...piece,
                x: resolved.x,
                y: resolved.y,
                rotation: resolved.rotation,
              }
            : piece
        ),
      });

      if (resolved.snap) {
        setSnapGuide({
          ...resolved.snap,
          x: resolved.x,
          y: resolved.y,
          width: movingPiece.width,
          height: movingPiece.height,
          rotation: resolved.rotation,
        });
        pulseSnap(resolved.snap.key);
        setStatus(`Snap target: ${resolved.snap.label}`);
      } else {
        setSnapGuide(null);
        lastSnapKeyRef.current = null;
        setStatus(
          snapEnabled
            ? "Free movement — move closer to snap."
            : "Free Move is on."
        );
      }
    },
    [
      pendingVariant,
      pointFromClient,
      createPendingPiece,
      resolvePosition,
      build,
      replacePresent,
      moveWallResize,
      pulseSnap,
      snapEnabled,
    ]
  );

  const endDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drawing = drawWallRef.current;
      if (drawing && drawing.pointerId === event.pointerId) {
        const guide = pendingGuide;
        drawWallRef.current = null;
        if (guide) {
          const definition = PIECE_CATEGORIES && categoryPieces.find((item) => item.id === drawing.variant);
          const newPiece: TemplePiece = {
            id: `${drawing.variant}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: "wall",
            variant: drawing.variant,
            material: build.defaultMaterial,
            x: guide.x,
            y: guide.y,
            width: guide.width,
            height: guide.height,
            wallHeight: definition?.wallHeight ?? 22,
            rotation: 0,
            layer: build.pieces.length + 1,
          };
          const next = cloneBuild(build);
          next.pieces.push(newPiece);
          commit(next);
          setSelectedId(newPiece.id);
          setPendingVariant(null);
          setPendingGuide(null);
          setDirty(true);
          pulseSnap("wall-drawn");
          setStatus("Wall room snapped into place. Tap it to customize.");
        }
        return;
      }

      if (resizeRef.current) {
        const resize = resizeRef.current;
        if (resize.pointerId !== event.pointerId) return;
        resizeRef.current = null;
        setHistory((h) => ({
          past: [...h.past, resize.before].slice(-HISTORY_LIMIT),
          present: h.present,
          future: [],
        }));
        setDirty(true);
        setStatus("Wall room resized.");
        return;
      }

      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      dragRef.current = null;
      setSnapGuide(null);
      lastSnapKeyRef.current = null;
      setHistory((h) => ({
        past: [...h.past, drag.before].slice(-HISTORY_LIMIT),
        present: h.present,
        future: [],
      }));
      setDirty(true);
      setStatus(snapEnabled ? "Piece placed." : "Piece moved freely.");
    },
    [pendingGuide, categoryPieces, build, commit, pulseSnap, setHistory, snapEnabled]
  );

  const beginWallResize = useCallback(
    (
      event: ReactPointerEvent<HTMLButtonElement>,
      piece: TemplePiece,
      corner: "nw" | "ne" | "sw" | "se"
    ) => {
      event.stopPropagation();
      setPendingVariant(null);
      resizeRef.current = {
        id: piece.id,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startWidth: piece.width,
        startDepth: piece.height,
        startXPos: piece.x,
        startYPos: piece.y,
        corner,
        before: cloneBuild(build),
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [build]
  );

  const duplicateSelected = useCallback(() => {
    if (!selectedPiece) return;
    const copy: TemplePiece = {
      ...selectedPiece,
      id: `\( {selectedPiece.variant}- \){Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,
      x: clamp(selectedPiece.x + 5, 3, 97),
      y: clamp(selectedPiece.y + 5, 3, 97),
      layer: build.pieces.length + 1,
    };
    const next = cloneBuild(build);
    next.pieces.push(copy);
    commit(next);
    setDirty(true);
    setSelectedId(copy.id);
    setStatus("Piece duplicated.");
  }, [selectedPiece, build, commit]);

  const mirrorSelected = useCallback(() => {
    if (!selectedPiece) return;
    const copy: TemplePiece = {
      ...selectedPiece,
      id: `\( {selectedPiece.variant}-mirror- \){Date.now()}`,
      x: clamp(100 - selectedPiece.x, 2, 98),
      rotation: -selectedPiece.rotation,
      layer: build.pieces.length + 1,
    };
    const next = cloneBuild(build);
    next.pieces.push(copy);
    commit(next);
    setDirty(true);
    setSelectedId(copy.id);
    pulseSnap(`mirror-${selectedPiece.id}`);
    setStatus("Mirrored copy created.");
  }, [selectedPiece, build, commit, pulseSnap]);

  const evenlySpaceType = useCallback(() => {
    if (!selectedPiece) return;
    const matching = build.pieces
      .filter((piece) => piece.type === selectedPiece.type)
      .sort((a, b) => a.x - b.x);

    if (matching.length < 3) {
      setStatus("Add at least 3 matching pieces to use Even Space.");
      return;
    }

    const minX = matching[0].x;
    const maxX = matching[matching.length - 1].x;
    const next = cloneBuild(build);
    const positions = new Map<string, number>();

    matching.forEach((piece, index) => {
      positions.set(
        piece.id,
        minX + ((maxX - minX) * index) / (matching.length - 1)
      );
    });

    next.pieces = next.pieces.map((piece) =>
      positions.has(piece.id)
        ? { ...piece, x: positions.get(piece.id)! }
        : piece
    );

    commit(next);
    setDirty(true);
    setStatus(`Evenly spaced ${matching.length} ${selectedPiece.type}s.`);
  }, [selectedPiece, build, commit]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    const next = cloneBuild(build);
    next.pieces = next.pieces.filter((piece) => piece.id !== selectedId);
    commit(next);
    setDirty(true);
    setSelectedId(null);
    setSnapGuide(null);
    setStatus("Piece deleted.");
  }, [selectedId, build, commit]);

  const save = useCallback(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(build));
    setDirty(false);
    setStatus("Saved on this device.");
  }, [build]);

  const load = useCallback(() => {
    if (dirty && !window.confirm("Discard unsaved changes and load?")) return;
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
      setDirty(false);
      setStatus("Saved temple loaded.");
    } catch {
      setStatus("Saved temple could not be loaded.");
    }
  }, [dirty, setHistory]);

  const reset = useCallback(() => {
    if (dirty && !window.confirm("Clear the entire build?")) return;
    setHistory({ past: [], present: createTempleBuild(), future: [] });
    setSelectedId(null);
    setPendingVariant(null);
    setPendingGuide(null);
    setSnapGuide(null);
    setDirty(false);
    setStatus("Builder cleared.");
  }, [dirty, setHistory]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      } else if (e.key === "Escape") {
        setSelectedId(null);
        setPendingVariant(null);
        setPendingGuide(null);
      } else if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        redo();
      } else if (
        selectedPiece &&
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        const dx =
          e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy =
          e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        updateSelected({
          x: clamp(selectedPiece.x + dx, 2, 98),
          y: clamp(selectedPiece.y + dy, 2, 98),
        });
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelected, undo, redo, selectedPiece, updateSelected]);

  const guide = snapGuide ?? pendingGuide;

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/20 px-3 py-3 sm:px-5">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.28em] text-amber-200/60">
              Echoes {dirty && <span className="text-amber-300">•</span>}
            </div>
            <input
              value={build.name}
              onChange={(event) => {
                replacePresent({ ...build, name: event.target.value });
                setDirty(true);
              }}
              className="w-full truncate bg-transparent text-lg font-semibold outline-none"
              aria-label="Temple name"
            />
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm disabled:opacity-30"
            >
              Undo
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
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
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <div className="text-xs text-white/60">
              {status}
              {build.pieces.length > 0 && (
                <span className="ml-2 text-white/30">
                  · {build.pieces.length} piece
                  {build.pieces.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-xl border border-white/10 bg-black/20 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("build")}
                  className={`rounded-lg px-3 py-1.5 text-xs ${
                    viewMode === "build"
                      ? "bg-white text-black"
                      : "text-white/60"
                  }`}
                >
                  Build
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("3d")}
                  className={`rounded-lg px-3 py-1.5 text-xs ${
                    viewMode === "3d" ? "bg-white text-black" : "text-white/60"
                  }`}
                >
                  3D Preview
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSnapEnabled((enabled) => !enabled);
                  setSnapGuide(null);
                  setPendingGuide(null);
                  lastSnapKeyRef.current = null;
                }}
                className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-medium ${
                  snapEnabled
                    ? "border-amber-200/40 bg-amber-200/10 text-amber-100"
                    : "border-white/10 bg-black/20 text-white/60"
                }`}
              >
                {snapEnabled ? "Snapping On" : "Free Move"}
              </button>
            </div>
          </div>

          {/* Keep stage mounted so pointer state survives 3-D toggle */}
          <div className={viewMode === "3d" ? "hidden" : "contents"}>
            <div
              ref={stageRef}
              onPointerDown={handleStagePointerDown}
              onPointerMove={handleStagePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onPointerLeave={() => {
                if (!dragRef.current && !resizeRef.current) {
                  setPendingGuide(null);
                }
              }}
              className={`relative min-h-[54vh] flex-1 touch-none overflow-hidden rounded-3xl border ${
                pendingVariant
                  ? "cursor-crosshair border-amber-300/50"
                  : "border-white/10"
              } bg-[radial-gradient(circle_at_50%_22%,rgba(120,140,180,0.28),transparent_36%),linear-gradient(180deg,#111827_0%,#202938_55%,#0f1720_100%)] shadow-2xl`}
            >
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[27%] bg-[linear-gradient(180deg,#29392d,#172019)]" />
              <div className="pointer-events-none absolute inset-x-0 bottom-[26%] border-t border-dashed border-white/10" />

              {guide && (
                <>
                  <div
                    className="pointer-events-none absolute z-[90] -translate-x-1/2 -translate-y-1/2 rounded-md border-2 border-dashed border-amber-200/80 bg-amber-200/10"
                    style={{
                      left: `${guide.x}%`,
                      top: `${guide.y}%`,
                      width: `${guide.width}%`,
                      height: `${guide.height}%`,
                      transform: `translate(-50%, -50%) rotate(${
                        guide.rotation ?? 0
                      }deg)`,
                    }}
                  />
                  <div
                    className="pointer-events-none absolute z-[100] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-amber-200 shadow-lg"
                    style={{ left: `\( {guide.x}%`, top: ` \){guide.y}%` }}
                  />
                  {guide.label !== "Place here" && (
                    <div
                      className="pointer-events-none absolute z-[100] -translate-x-1/2 translate-y-3 rounded-full bg-black/70 px-2 py-1 text-[10px] text-amber-100 backdrop-blur"
                      style={{ left: `\( {guide.x}%`, top: ` \){guide.y}%` }}
                    >
                      {guide.label}
                    </div>
                  )}
                </>
              )}

              {build.pieces.map((piece) => (
                <PieceShape
                  key={piece.id}
                  piece={piece}
                  selected={piece.id === selectedId}
                  onPointerDown={(event) => beginDrag(event, piece)}
                />
              ))}

              {selectedPiece?.type === "wall" && (
              <>
                {(
                  [
                    ["nw", -1, -1],
                    ["ne", 1, -1],
                    ["sw", -1, 1],
                    ["se", 1, 1],
                  ] as const
                ).map(([corner, sx, sy]) => {
                  const angle = (selectedPiece.rotation * Math.PI) / 180;
                  const localX = sx * (selectedPiece.width / 2);
                  const localY = sy * (selectedPiece.height / 2);
                  const rotatedX =
                    localX * Math.cos(angle) - localY * Math.sin(angle);
                  const rotatedY =
                    localX * Math.sin(angle) + localY * Math.cos(angle);

                  return (
                    <button
                      key={corner}
                      type="button"
                      aria-label={`Resize ${corner} corner`}
                      onPointerDown={(event) =>
                        beginWallResize(event, selectedPiece, corner)
                      }
                      className="absolute z-[120] h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-md border-2 border-black bg-amber-200 shadow-lg"
                      style={{
                        left: `${selectedPiece.x + rotatedX}%`,
                        top: `${selectedPiece.y + rotatedY}%`,
                      }}
                    />
                  );
                })}
              </>
            )}

            {!build.pieces.length && !pendingVariant && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8 text-center text-sm text-white/35">
                Choose one of the eight categories below to start building.
              </div>
            )}

            {pendingVariant && (
              <div className="pointer-events-none absolute left-1/2 top-4 z-[110] -translate-x-1/2 rounded-full bg-amber-200 px-4 py-2 text-xs font-semibold text-black shadow-xl">
                {activeCategory === "wall"
                  ? "Touch and pull to size the room • release to snap"
                  : "Tap where you want to place it"}
              </div>
            )}
          </div>
        </div>

        {viewMode === "3d" && <Temple3DPreview build={build} />}

        {viewMode === "build" && selectedPiece && (
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
                {selectedPiece.type === "wall" ? "Room width" : "Width"}
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
                {selectedPiece.type === "wall" ? "Room depth" : "Height"}
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

              {selectedPiece.type === "wall" && (
                <label className="rounded-xl border border-white/10 bg-black/20 p-2 text-xs">
                  Wall height
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={selectedPiece.wallHeight ?? 22}
                    onChange={(event) =>
                      updateSelected({
                        wallHeight: Number(event.target.value),
                      })
                    }
                    className="mt-2 w-full"
                  />
                </label>
              )}

              <label className="rounded-xl border border-white/10 bg-black/20 p-2 text-xs">
                Rotation
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="15"
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
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <button
                onClick={duplicateSelected}
                className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm"
              >
                Duplicate
              </button>
              <button
                onClick={mirrorSelected}
                className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm"
              >
                Mirror
              </button>
              <button
                onClick={evenlySpaceType}
                className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm"
              >
                Even Space
              </button>
            </div>
          </div>
        )}

        {viewMode === "build" && (
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
            <div className="flex gap-1 overflow-x-auto p-2">
              {PIECE_CATEGORIES.map((category) => (
                <button
                  key={category.type}
                  onClick={() => {
                    setActiveCategory(category.type);
                    setPendingVariant(null);
                    setPendingGuide(null);
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
                      setPendingGuide(null);
                      setStatus(
                        `${piece.name} selected. Tap the build area to place it.`
                      );
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
        )}

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
