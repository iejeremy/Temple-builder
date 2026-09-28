"use client";

import { useEffect, useMemo, useState } from "react";

import {
  TEMPLE_MATERIALS,
  TEMPLE_TEMPLATES,
  createTempleBuild,
} from "@/lib/temple-builder/catalog";
import type {
  TempleBuild,
  TempleMaterial,
  TempleTemplateId,
} from "@/lib/temple-builder/types";

const STORAGE_KEY = "echoes-temple-builder-v1";

function TemplePreview({ build }: { build: TempleBuild }) {
  const material =
    TEMPLE_MATERIALS.find((candidate) => candidate.id === build.material) ??
    TEMPLE_MATERIALS[0];

  const columns = Array.from(
    { length: Math.max(2, build.columnCount) },
    (_, index) => index
  );

  const templeWidth = `${build.width}%`;
  const templeHeight = `${build.height}%`;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl border border-white/15 bg-[radial-gradient(circle_at_50%_22%,rgba(120,140,180,0.35),transparent_38%),linear-gradient(180deg,#111827_0%,#1f2937_50%,#0b1020_100%)] shadow-2xl">
      <div className="absolute inset-x-0 bottom-0 h-[36%] bg-[linear-gradient(180deg,#233128_0%,#172019_100%)]" />
      <div className="absolute inset-x-0 bottom-[34%] h-px bg-white/10" />

      <div
        className="absolute bottom-[16%] left-1/2 -translate-x-1/2"
        style={{ width: templeWidth, height: templeHeight }}
      >
        {build.hasDome && (
          <div
            className="absolute left-1/2 top-[4%] h-[34%] w-[42%] -translate-x-1/2 rounded-t-[999px] border border-black/20"
            style={{ background: material.surface }}
          />
        )}

        {build.hasPediment && (
          <div
            className="absolute left-1/2 top-[18%] h-[24%] w-[82%] -translate-x-1/2"
            style={{
              background: material.accent,
              clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
            }}
          />
        )}

        <div
          className="absolute bottom-[18%] left-1/2 h-[56%] w-[86%] -translate-x-1/2 rounded-sm border border-black/20 shadow-[0_28px_70px_rgba(0,0,0,0.5)]"
          style={{ background: material.surface }}
        >
          <div className="absolute inset-y-0 left-[7%] right-[7%] flex items-end justify-between">
            {columns.map((column) => (
              <div
                key={column}
                className="relative h-[86%] w-[5.5%] min-w-[8px]"
              >
                <div
                  className="absolute inset-x-[-22%] top-0 h-[7%] rounded-sm"
                  style={{ background: material.accent }}
                />
                <div
                  className="absolute inset-x-0 bottom-[7%] top-[6%] rounded-sm border-x border-black/15"
                  style={{
                    background: `linear-gradient(90deg,${material.surface},${material.accent},${material.surface})`,
                  }}
                />
                <div
                  className="absolute inset-x-[-25%] bottom-0 h-[8%] rounded-sm"
                  style={{ background: material.accent }}
                />
              </div>
            ))}
          </div>

          <div className="absolute bottom-0 left-1/2 h-[54%] w-[18%] -translate-x-1/2 rounded-t-sm bg-black/35" />
        </div>

        {build.hasStairs && (
          <>
            <div
              className="absolute bottom-[12%] left-1/2 h-[8%] w-[96%] -translate-x-1/2 border border-black/20"
              style={{ background: material.accent }}
            />
            <div
              className="absolute bottom-[6%] left-1/2 h-[7%] w-full -translate-x-1/2 border border-black/20 opacity-95"
              style={{ background: material.surface }}
            />
            <div
              className="absolute bottom-0 left-1/2 h-[7%] w-[106%] -translate-x-1/2 border border-black/20 opacity-90"
              style={{ background: material.accent }}
            />
          </>
        )}
      </div>

      <div className="absolute left-5 top-5 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/70 backdrop-blur">
        Builder Preview
      </div>
    </div>
  );
}

export default function TempleBuilderPage() {
  const [build, setBuild] = useState<TempleBuild>(() => createTempleBuild());
  const [status, setStatus] = useState("Prototype");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as TempleBuild;
      if (parsed?.version === 1) {
        setBuild(parsed);
        setStatus("Loaded saved build");
      }
    } catch {
      setStatus("Could not load saved build");
    }
  }, []);

  const selectedTemplate = useMemo(
    () =>
      TEMPLE_TEMPLATES.find(
        (candidate) => candidate.id === build.templateId
      ) ?? TEMPLE_TEMPLATES[0],
    [build.templateId]
  );

  const update = <K extends keyof TempleBuild>(
    key: K,
    value: TempleBuild[K]
  ) => {
    setBuild((previous) => ({ ...previous, [key]: value }));
    setStatus("Unsaved changes");
  };

  const applyTemplate = (templateId: TempleTemplateId) => {
    const template =
      TEMPLE_TEMPLATES.find((candidate) => candidate.id === templateId) ??
      TEMPLE_TEMPLATES[0];

    setBuild((previous) => ({
      ...previous,
      templateId,
      ...template.defaults,
    }));
    setStatus("Template applied");
  };

  const save = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(build));
    setStatus("Saved on this device");
  };

  const reset = () => {
    const fresh = createTempleBuild();
    setBuild(fresh);
    window.localStorage.removeItem(STORAGE_KEY);
    setStatus("Reset");
  };

  const exportJson = async () => {
    const data = JSON.stringify(build, null, 2);
    try {
      await navigator.clipboard.writeText(data);
      setStatus("Build JSON copied");
    } catch {
      setStatus("Clipboard unavailable");
    }
  };

  return (
    <main className="min-h-screen bg-[#070b14] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">
              Echoes Lab
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Temple Builder
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              Experimental builder isolated from the production Echoes flow.
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm text-white/70">
            {status}
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/50">
                Temple name
              </span>
              <input
                value={build.name}
                onChange={(event) => update("name", event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 outline-none ring-amber-200/40 focus:ring-2"
              />
            </label>

            <div>
              <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/50">
                Template
              </span>
              <div className="grid gap-2">
                {TEMPLE_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template.id)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      build.templateId === template.id
                        ? "border-amber-200/60 bg-amber-200/10"
                        : "border-white/10 bg-black/20 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="mt-1 text-xs leading-5 text-white/50">
                      {template.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/50">
                Material
              </span>
              <select
                value={build.material}
                onChange={(event) =>
                  update("material", event.target.value as TempleMaterial)
                }
                className="w-full rounded-2xl border border-white/10 bg-[#111827] px-4 py-3 outline-none"
              >
                {TEMPLE_MATERIALS.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <label className="block">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>Width</span>
                  <span className="text-white/50">{build.width}</span>
                </div>
                <input
                  type="range"
                  min="48"
                  max="92"
                  value={build.width}
                  onChange={(event) => update("width", Number(event.target.value))}
                  className="w-full"
                />
              </label>

              <label className="block">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>Height</span>
                  <span className="text-white/50">{build.height}</span>
                </div>
                <input
                  type="range"
                  min="42"
                  max="86"
                  value={build.height}
                  onChange={(event) => update("height", Number(event.target.value))}
                  className="w-full"
                />
              </label>

              <label className="block">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>Columns</span>
                  <span className="text-white/50">{build.columnCount}</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="12"
                  step="2"
                  value={build.columnCount}
                  onChange={(event) =>
                    update("columnCount", Number(event.target.value))
                  }
                  className="w-full"
                />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                ["hasStairs", "Stairs"],
                ["hasPediment", "Pediment"],
                ["hasDome", "Dome"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() =>
                    update(
                      key as "hasStairs" | "hasPediment" | "hasDome",
                      !build[key as "hasStairs" | "hasPediment" | "hasDome"]
                    )
                  }
                  className={`rounded-2xl border px-2 py-3 text-sm ${
                    build[key as "hasStairs" | "hasPediment" | "hasDome"]
                      ? "border-amber-200/60 bg-amber-200/10"
                      : "border-white/10 bg-black/20 text-white/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={save}
                className="rounded-2xl bg-amber-200 px-3 py-3 text-sm font-semibold text-black"
              >
                Save
              </button>
              <button
                onClick={exportJson}
                className="rounded-2xl border border-white/15 bg-white/[0.05] px-3 py-3 text-sm"
              >
                Copy JSON
              </button>
              <button
                onClick={reset}
                className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/60"
              >
                Reset
              </button>
            </div>
          </aside>

          <div className="min-h-[620px] rounded-3xl border border-white/10 bg-white/[0.03] p-3 sm:p-5">
            <TemplePreview build={build} />

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                  Template
                </div>
                <div className="mt-1 font-medium">{selectedTemplate.name}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                  Footprint
                </div>
                <div className="mt-1 font-medium">
                  {build.width} × {build.height}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                  Architecture
                </div>
                <div className="mt-1 font-medium">
                  {build.columnCount} columns
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
