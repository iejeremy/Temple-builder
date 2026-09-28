"use client";

import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import type { TempleBuild, TemplePiece } from "@/lib/temple-builder/types";
import { TEMPLE_MATERIALS } from "@/lib/temple-builder/catalog";

function colorFor(piece: TemplePiece) {
  return (
    TEMPLE_MATERIALS.find((material) => material.id === piece.material)?.surface ??
    "#d9d4cc"
  );
}

function PieceMesh({ piece }: { piece: TemplePiece }) {
  const x = (piece.x - 50) / 6;
  const z = (piece.y - 50) / 6;
  const width = Math.max(0.3, piece.width / 7);
  const height = Math.max(0.3, piece.height / 7);
  const depth =
    piece.type === "wall" ? 0.45 :
    piece.type === "floor" ? Math.max(1.2, piece.height / 5) :
    piece.type === "tower" ? Math.max(1.2, piece.width / 7) :
    piece.type === "roof" ? Math.max(1.1, piece.height / 6) :
    0.7;

  const y =
    piece.type === "floor"
      ? 0.18
      : Math.max(0.35, height / 2);

  if (piece.type === "wall") {
    const roomWidth = Math.max(1, piece.width / 7);
    const roomDepth = Math.max(1, piece.height / 7);
    const wallHeight = Math.max(0.8, (piece.wallHeight ?? 22) / 7);
    const thickness = 0.35;
    const rotationY = (piece.rotation * Math.PI) / 180;

    return (
      <group position={[x, 0, z]} rotation={[0, rotationY, 0]}>
        <mesh position={[0, wallHeight / 2, -roomDepth / 2]} castShadow receiveShadow>
          <boxGeometry args={[roomWidth, wallHeight, thickness]} />
          <meshStandardMaterial color={colorFor(piece)} roughness={0.72} metalness={0.04} />
        </mesh>
        <mesh position={[0, wallHeight / 2, roomDepth / 2]} castShadow receiveShadow>
          <boxGeometry args={[roomWidth, wallHeight, thickness]} />
          <meshStandardMaterial color={colorFor(piece)} roughness={0.72} metalness={0.04} />
        </mesh>
        <mesh position={[-roomWidth / 2, wallHeight / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[thickness, wallHeight, roomDepth]} />
          <meshStandardMaterial color={colorFor(piece)} roughness={0.72} metalness={0.04} />
        </mesh>
        <mesh position={[roomWidth / 2, wallHeight / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[thickness, wallHeight, roomDepth]} />
          <meshStandardMaterial color={colorFor(piece)} roughness={0.72} metalness={0.04} />
        </mesh>
      </group>
    );
  }

  if (piece.type === "column") {
    return (
      <mesh position={[x, y, z]} rotation={[0, (piece.rotation * Math.PI) / 180, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[width / 2, width / 2.3, height, 20]} />
        <meshStandardMaterial color={colorFor(piece)} roughness={0.7} metalness={0.05} />
      </mesh>
    );
  }

  if (piece.type === "tower" && piece.variant === "tower-round") {
    return (
      <mesh position={[x, y, z]} rotation={[0, (piece.rotation * Math.PI) / 180, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[width / 2, width / 2, height, 24]} />
        <meshStandardMaterial color={colorFor(piece)} roughness={0.72} />
      </mesh>
    );
  }

  if (piece.type === "roof" && piece.variant === "roof-dome") {
    return (
      <mesh position={[x, y, z]} rotation={[0, (piece.rotation * Math.PI) / 180, 0]} castShadow>
        <sphereGeometry args={[Math.max(width, depth) / 2, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={colorFor(piece)} roughness={0.6} />
      </mesh>
    );
  }

  if (piece.type === "roof" && piece.variant === "roof-pediment") {
    return (
      <mesh position={[x, y, z]} rotation={[0, (piece.rotation * Math.PI) / 180, 0]} castShadow>
        <coneGeometry args={[Math.max(width, depth) / 1.7, height, 3]} />
        <meshStandardMaterial color={colorFor(piece)} roughness={0.65} />
      </mesh>
    );
  }

  return (
    <mesh
      position={[x, y, z]}
      rotation={[0, (piece.rotation * Math.PI) / 180, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={colorFor(piece)} roughness={0.72} metalness={0.04} />
    </mesh>
  );
}

export default function Temple3DPreview({ build }: { build: TempleBuild }) {
  return (
    <div className="relative h-full min-h-[54vh] overflow-hidden rounded-3xl border border-white/10 bg-[#0b1020]">
      <Canvas
        shadows
        camera={{ position: [10, 9, 12], fov: 45 }}
        dpr={[1, 1.7]}
      >
        <color attach="background" args={["#0b1020"]} />
        <fog attach="fog" args={["#0b1020", 18, 34]} />

        <ambientLight intensity={1.25} />
        <directionalLight
          position={[8, 14, 10]}
          intensity={2.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-8, 6, -6]} intensity={0.75} />

        <mesh position={[0, -0.15, 0]} receiveShadow>
          <boxGeometry args={[18, 0.3, 14]} />
          <meshStandardMaterial color="#223126" roughness={1} />
        </mesh>

        <gridHelper args={[18, 18, "#5f6b63", "#29342d"]} position={[0, 0.01, 0]} />

        {build.pieces.map((piece) => (
          <PieceMesh key={piece.id} piece={piece} />
        ))}

        <ContactShadows
          position={[0, 0.02, 0]}
          opacity={0.5}
          scale={16}
          blur={2.6}
          far={10}
        />

        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={5}
          maxDistance={24}
          minPolarAngle={0.35}
          maxPolarAngle={Math.PI / 2.03}
          target={[0, 2.2, 0]}
        />
      </Canvas>

      <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/10 bg-black/45 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-white/70 backdrop-blur">
        3D Preview
      </div>

      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/45 px-3 py-2 text-xs text-white/60 backdrop-blur">
        Drag to rotate • Pinch/scroll to zoom
      </div>
    </div>
  );
}
