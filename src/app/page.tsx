"use client";

import dynamic from "next/dynamic";

const TempleWorld = dynamic(() => import("@/components/Temple3DPreview"), {
  ssr: false,
  loading: () => <div className="flex h-[100dvh] items-center justify-center bg-[#111820] text-white">Loading 3D test…</div>,
});

export default function TempleBuilderPage() {
  return (
    <main className="h-[100dvh] overflow-hidden bg-[#0d1319]">
      <TempleWorld />
    </main>
  );
}
