import * as THREE from "three";
import type { LandscapeTheme } from "./sceneryPresets";

function ridgeGeometry(snow: boolean) {
  const geometry = new THREE.CylinderGeometry(.025, 1, 1, 20, 5);
  const positions = geometry.getAttribute("position");
  const rock = new THREE.Color(snow ? 0x697885 : 0x887365);
  const snowColor = new THREE.Color(0xeaf4fa);
  const color = new THREE.Color();
  const colors: number[] = [];

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const height = positions.getY(i) + .5;
    const angle = Math.atan2(z, x);
    const ridge = .89 + .11 * Math.cos(5 * angle + height) + .08 * Math.sin(9 * angle);
    const slope = snow ? 1 : 1 + height * .65;
    positions.setXYZ(i, x * ridge * slope + height * .18, height, z * ridge * slope);

    color.copy(rock).multiplyScalar(.83 + .17 * Math.cos(3 * angle + height * 12) + .13 * Math.sin(height * 23));
    if (snow) {
      const snowline = .43 + .14 * Math.sin(angle * 4) + .08 * Math.cos(angle * 9);
      color.lerp(snowColor, THREE.MathUtils.smoothstep(height, snowline, snowline + .17));
    }
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function createRidges(name: string, snow: boolean, count: number) {
  const group = new THREE.Group();
  group.name = name;
  const geometry = ridgeGeometry(snow);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true });
  for (let i = 0; i < count; i++) {
    const ridge = new THREE.Mesh(geometry, material);
    ridge.rotation.y = i * 1.85;
    group.add(ridge);
  }
  return group;
}

function islandWaterGeometry(hx: number, hz: number) {
  const positions: number[] = [], colors: number[] = [], uvs: number[] = [], indices: number[] = [];
  const segments = 64;
  const rowLength = segments + 1;
  // A rounded rectangle encloses the complete clearing, including the corners.
  const radiusX = Math.pow(2, .25) * (hx + 2);
  const radiusZ = Math.pow(2, .25) * (hz + 2);
  const horizon = Math.max(1500, Math.hypot(radiusX, radiusZ) + 100);
  const shallows = new THREE.Color(0x73b5ae);
  const deep = new THREE.Color(0x326f8c);

  for (let row = 0; row < 3; row++) {
    const color = row === 0 ? shallows : deep;
    for (let i = 0; i <= segments; i++) {
      const angle = i / segments * Math.PI * 2;
      const dx = Math.cos(angle);
      const dz = Math.sin(angle);
      const shore = Math.pow(Math.pow(dx / radiusX, 4) + Math.pow(dz / radiusZ, 4), -.25);
      const distance = row === 2 ? horizon : shore + row * 5;
      const x = dx * distance;
      const z = dz * distance;
      positions.push(x, .065, z);
      colors.push(color.r, color.g, color.b);
      uvs.push(x / 4, -z / 4);
      if (row < 2 && i < segments) {
        const at = row * rowLength + i;
        indices.push(at, at + 1, at + rowLength, at + 1, at + rowLength + 1, at + rowLength);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Background geometry follows the clearing and remains outside the editable site. */
export function createSceneryBackdrops(waterMaterial: THREE.Material) {
  const root = new THREE.Group();
  const cliffs = createRidges("environment-mountain-cut", false, 4);
  const peaks = createRidges("environment-snowy-summit", true, 4);
  const island = new THREE.Mesh(new THREE.BufferGeometry(), waterMaterial);
  island.name = "environment-island-water";
  island.receiveShadow = true;
  root.add(cliffs, peaks, island);
  let islandSize = "";

  function setTheme(theme: LandscapeTheme, hx: number, hz: number) {
    cliffs.visible = theme === "mountain-cut";
    peaks.visible = theme === "snowy-summit";
    island.visible = theme === "island";

    if (cliffs.visible) {
      const offsets = [[-9, -14, 12, 20, 9], [9, -15, 11, 23, 10], [-19, -24, 16, 26, 13], [18, -25, 14, 30, 14]];
      cliffs.children.forEach((ridge, i) => {
        const [x, z, width, height, depth] = offsets[i];
        ridge.position.set(x + Math.sign(x) * hx, 0, z - hz);
        ridge.scale.set(width, height, depth);
      });
    }

    if (peaks.visible) {
      const offsets = [[-18, -30, 17, 30, 15], [2, -38, 20, 44, 18], [23, -33, 18, 35, 15], [35, -21, 13, 23, 11]];
      peaks.children.forEach((peak, i) => {
        const [x, z, width, height, depth] = offsets[i];
        peak.position.set(x, 0, z - hz - hx * .3);
        peak.scale.set(width, height, depth);
      });
    }

    const key = `${hx},${hz}`;
    if (island.visible && key !== islandSize) {
      island.geometry.dispose();
      island.geometry = islandWaterGeometry(hx, hz);
      islandSize = key;
    }
  }

  return { root, setTheme };
}
