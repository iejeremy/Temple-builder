"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { TempleBuild, TemplePiece } from "@/lib/temple-builder/types";
import { TEMPLE_MATERIALS } from "@/lib/temple-builder/catalog";

function colorFor(piece: TemplePiece) {
  return TEMPLE_MATERIALS.find((m) => m.id === piece.material)?.surface ?? "#d9d4cc";
}

function Building({ piece, selected, onSelect }: { piece: TemplePiece; selected: boolean; onSelect: () => void }) {
  const x = (piece.x - 50) / 5;
  const z = (piece.y - 50) / 5;
  const width = Math.max(1.4, piece.width / 7);
  const depth = Math.max(1.4, piece.height / 7);
  const height = Math.max(1.2, (piece.wallHeight ?? 22) / 7);
  const t = 0.24;
  const color = colorFor(piece);
  const wallMaterial = () => (
    <meshStandardMaterial color={color} roughness={0.78} metalness={0.02} />
  );

  return (
    <group position={[x, 0, z]} rotation={[0, piece.rotation * Math.PI / 180, 0]} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[width + .25, .16, depth + .25]} />
        <meshStandardMaterial color="#9a9384" roughness={1} />
      </mesh>
      <mesh position={[0, height/2, -depth/2]}><boxGeometry args={[width,height,t]} />{wallMaterial()}</mesh>
      <mesh position={[0, height/2, depth/2]}><boxGeometry args={[width,height,t]} />{wallMaterial()}</mesh>
      <mesh position={[-width/2, height/2, 0]}><boxGeometry args={[t,height,depth]} />{wallMaterial()}</mesh>
      <mesh position={[width/2, height/2, 0]}><boxGeometry args={[t,height,depth]} />{wallMaterial()}</mesh>
      {selected && (
        <mesh position={[0,.04,0]}>
          <boxGeometry args={[width+.55,.06,depth+.55]} />
          <meshBasicMaterial color="#f5d88b" transparent opacity={.55} />
        </mesh>
      )}
    </group>
  );
}

export default function Temple3DPreview({
  build, selectedId, onSelect,
}: {
  build: TempleBuild;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onMove?: (id: string, x: number, y: number) => void;
}) {
  return (
    <div className="absolute inset-0 bg-[#b9c4cb]">
      <Canvas
        gl={{ antialias: false, powerPreference: "default", alpha: false }}
        camera={{ position: [9, 8, 11], fov: 43 }}
        dpr={1}
        onPointerMissed={() => onSelect?.(null)}
      >
        <color attach="background" args={["#b9c4cb"]} />
        <fog attach="fog" args={["#b9c4cb", 22, 45]} />
        <hemisphereLight intensity={1.7} groundColor="#7f7a6c" />
        <directionalLight position={[7, 14, 8]} intensity={2.2} />

        <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.02,0]}>
          <planeGeometry args={[38,38]} />
          <meshStandardMaterial color="#8b8a78" roughness={1} />
        </mesh>
        <gridHelper args={[38, 24, "#74766b", "#85877b"]} position={[0, .005, 0]} />

        {build.pieces.filter(p => p.type === "wall").map((piece) => (
          <Building key={piece.id} piece={piece} selected={piece.id===selectedId} onSelect={() => onSelect?.(piece.id)} />
        ))}

        <OrbitControls makeDefault enablePan={false} minDistance={5} maxDistance={25}
          minPolarAngle={.45} maxPolarAngle={Math.PI/2.08} target={[0,1.5,0]} />
      </Canvas>

      <div className="pointer-events-none absolute bottom-[150px] left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-3 py-2 text-xs text-white/70 backdrop-blur">
        Drag to look around • pinch to zoom • tap a building to edit
      </div>
    </div>
  );
}
