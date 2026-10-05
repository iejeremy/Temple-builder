"use client";

import { Canvas } from "@react-three/fiber";
import type { TempleBuild } from "@/lib/temple-builder/types";

export default function Temple3DPreview({
  build: _build,
  selectedId: _selectedId,
  onSelect: _onSelect,
  onMove: _onMove,
}: {
  build: TempleBuild;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onMove?: (id: string, x: number, y: number) => void;
}) {
  return (
    <div className="absolute inset-0 bg-[#b9c4cb]">
      <Canvas
        gl={{ antialias: false, alpha: false, powerPreference: "default" }}
        camera={{ position: [3, 2.5, 5], fov: 45 }}
        dpr={1}
      >
        <color attach="background" args={["#b9c4cb"]} />
        <ambientLight intensity={1.5} />
        <directionalLight position={[4, 6, 4]} intensity={2} />
        <mesh>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#d9d4cc" />
        </mesh>
      </Canvas>

      <div className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 rounded-full bg-black/55 px-4 py-2 text-xs text-white backdrop-blur">
        3D diagnostic: single cube
      </div>
    </div>
  );
}
