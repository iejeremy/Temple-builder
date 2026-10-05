"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Temple3DPreview() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#b9c4cb");

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(3, 2.5, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: "default",
    });
    renderer.setPixelRatio(1);
    host.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(4, 6, 4);
    scene.add(sun);

    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({ color: "#d9d4cc" });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
    };

    resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div ref={hostRef} className="absolute inset-0 bg-[#b9c4cb]">
      <div className="pointer-events-none absolute left-1/2 top-24 z-10 -translate-x-1/2 rounded-full bg-black/55 px-4 py-2 text-xs text-white">
        Plain Three.js diagnostic
      </div>
    </div>
  );
}
