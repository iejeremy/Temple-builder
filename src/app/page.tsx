"use client";

import dynamic from "next/dynamic";
import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
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
/*  Pure helpers                                                       */
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

type Guide = SnapPoint & { width: number; height: number };

function nearestSnap(
  piece: TemplePiece,
  proposedX: number,
  proposedY: number,
  pieces: TemplePiece[]
): SnapPoint | null {
  const others = pieces.filter((c) => c.id !== piece.id);
  const candidates: SnapPoint[] = [];

  // … (identical snap rules as before – kept for brevity; you can
  //     extract each piece-type block into its own function later)

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
      const projected =
        (proposedX - wall.x) * dirX + (proposedY - wall.y) * dirY;
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
      for (let i = 0; i < 5; i++) {
        candidates.push({
          x: left + ((right - left) * i) / 4,
          y,
          key: `column-grid-\( {floor.id}- \){i}`,
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
    for (let i = 0; i < supports.length; i++) {
      for (let j = i + 1; j < supports.length; j++) {
        const a = supports[i];
        const b = supports[j];
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

  // generic alignment
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
/*  History hook                                                       */
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
        future: [cloneBuild(h.present), ...
