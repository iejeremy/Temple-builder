import * as THREE from "three";
import type { LandscapeTheme } from "./sceneryPresets";

const { smoothstep, lerp } = THREE.MathUtils;

function cliffHeight(x: number, z: number, phase: number) {
  const crest = -.38 + .11 * Math.sin(4 * z + phase) + .055 * Math.sin(12 * z - phase);
  const slope = smoothstep(x, -.93, crest) * (1 - smoothstep(x, crest, .97));
  const end = 1 - smoothstep(Math.abs(z), .67, 1);
  const profile = .75 + .15 * Math.sin(5 * z + phase) + .1 * Math.cos(11 * z - phase);
  const erosion = .94 + .06 * Math.cos(23 * z + 5 * x) + .045 * Math.sin(41 * z + 9 * x);
  return slope * end * profile * erosion;
}

function summitHeight(x: number, z: number, phase: number) {
  const broad = Math.max(0, 1 - Math.hypot(x, z));
  const spine = Math.max(0, 1 - Math.hypot(x + .23 * z, z * 1.65));
  const gullies = Math.sin(Math.atan2(z, x) * 6 + phase) * .1 * smoothstep(broad, 0, .23);
  return broad ** 1.25 * (.67 + gullies) + .33 * spine ** 1.7;
}

function ridgeGeometry(snow: boolean, phase: number) {
  const geometry = new THREE.PlaneGeometry(2, 2, 48, 64);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    positions.setY(i, snow ? summitHeight(x, z, phase) : cliffHeight(x, z, phase));
  }

  geometry.computeVertexNormals();
  const normals = geometry.getAttribute("normal");
  const rock = new THREE.Color(snow ? 0x5c6673 : 0x806b5b);
  const pale = new THREE.Color(snow ? 0xe2ecf6 : 0xb09981);
  const scree = new THREE.Color(snow ? 0xb9c7d5 : 0x9b8979);
  const color = new THREE.Color();
  const colors: number[] = [];
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i), y = positions.getY(i);
    const grain = Math.sin(37 * x + 12 * z) * Math.cos(23 * z - 7 * x + phase);
    const beds = Math.sin(59 * y + z * 5 + Math.sin(z * 10 + x) * .65);
    const slope = normals.getY(i);
    color.copy(rock).lerp(pale, snow ? .08 : smoothstep(beds, -.48, .85) * .6);
    color.multiplyScalar(.93 + .16 * grain + .09 * Math.cos(26 * z + phase));
    color.lerp(scree, (1 - smoothstep(y, .015, .21)) * .65);
    if (snow) {
      const gullies = Math.cos(Math.atan2(z, x) * 6 + phase) * .15 + grain * .075;
      const snowline = .43 + gullies + (1 - slope) * .54;
      const apron = (1 - smoothstep(y, .04, .31)) * smoothstep(slope, .75, .98);
      color.lerp(pale, Math.max(apron, smoothstep(y, snowline, snowline + .14)));
    }
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

function createRidges(name: string, snow: boolean, count: number) {
  const group = new THREE.Group();
  group.name = name;
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  for (let i = 0; i < count; i++) {
    const ridge = new THREE.Mesh(ridgeGeometry(snow, i * 1.85), material);
    // The left wall mirrors the right wall's steep inward-facing slope.
    ridge.rotation.y = snow ? i * .86 : i % 2 === 0 ? Math.PI : 0;
    group.add(ridge);
  }
  return group;
}

type ShorePoint = { x: number; z: number; radius: number; angle: number };
type ShoreRow = { offset: number; height: number; color: number; alpha?: number };
const waterHeight = .065;

function islandShore(hx: number, hz: number) {
  const rx = Math.pow(2, .25) * (hx + 3), rz = Math.pow(2, .25) * (hz + 3);
  return Array.from({ length: 129 }, (_, i): ShorePoint => {
    const angle = i / 128 * Math.PI * 2;
    const x = Math.cos(angle), z = Math.sin(angle);
    const rounded = Math.pow((x / rx) ** 4 + (z / rz) ** 4, -.25);
    const variation = Math.sin(3 * angle + .65) * .8 + Math.sin(5 * angle - .85) * .46 + Math.cos(9 * angle) * .23;
    return { x, z, radius: rounded + variation, angle };
  });
}

function shoreGeometry(shore: ShorePoint[], rows: ShoreRow[], options: { horizon?: number; broken?: boolean } = {}) {
  const { horizon, broken } = options;
  const positions: number[] = [], colors: number[] = [], uvs: number[] = [], indices: number[] = [];
  const withAlpha = rows[0].alpha !== undefined;
  const color = new THREE.Color();
  rows.forEach(({ offset, height, color: hex, alpha = 1 }, row) => {
    shore.forEach(({ x, z, radius, angle }, i) => {
      const distance = horizon && row === rows.length - 1 ? horizon : radius + offset;
      const px = x * distance, pz = z * distance;
      positions.push(px, height, pz);
      const grain = horizon && row === rows.length - 1 ? 0 : Math.sin(angle * 19 + .7) * Math.cos(angle * 31 - .4);
      color.setHex(hex).multiplyScalar(1 + grain * .055);
      colors.push(color.r, color.g, color.b);
      if (withAlpha) {
        const crest = smoothstep(Math.sin(angle * 7 + 1) + .35 * Math.cos(angle * 23), -.65, .7);
        colors.push(alpha * (broken ? lerp(.14, 1, crest) : 1));
      }
      uvs.push(px / 4, -pz / 4);
      if (row < rows.length - 1 && i < shore.length - 1) {
        const at = row * shore.length + i, next = at + shore.length;
        indices.push(at, at + 1, next, at + 1, next + 1, next);
      }
    });
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, withAlpha ? 4 : 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Background geometry follows the clearing and remains outside the editable site. */
export function createSceneryBackdrops(waterMaterial: THREE.Material) {
  const root = new THREE.Group();
  const cliffs = createRidges("environment-mountain-cut", false, 2);
  const peaks = createRidges("environment-snowy-summit", true, 5);
  const island = new THREE.Mesh(new THREE.BufferGeometry(), waterMaterial);
  island.name = "environment-island-water";
  island.receiveShadow = true;
  const wetSand = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({
    vertexColors: true, transparent: true, depthWrite: false, roughness: .84,
  }));
  wetSand.name = "environment-island-wet-sand";
  const foam = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, depthWrite: false,
  }));
  foam.name = "environment-island-surf";
  root.add(cliffs, peaks, island, wetSand, foam);
  let islandSize = "";

  function setTheme(theme: LandscapeTheme, hx: number, hz: number) {
    cliffs.visible = theme === "mountain-cut";
    peaks.visible = theme === "snowy-summit";
    wetSand.visible = foam.visible = island.visible = theme === "island";

    if (cliffs.visible) {
      cliffs.children.forEach((ridge, i) => {
        const side = i === 0 ? -1 : 1;
        const width = 14 + i * 2;
        ridge.position.set(side * (hx + width + 2), -.035, -hz - 13 + i * 3);
        ridge.scale.set(width, 20 + i * 3, 24 - i * 3);
      });
    }

    if (peaks.visible) {
      const offsets = [[-30, -30, 20, 18, 18], [-15, -36, 22, 24, 22], [3, -48, 27, 28, 23],
        [22, -40, 22, 23, 19], [41, -36, 22, 17, 18]];
      peaks.children.forEach((peak, i) => {
        const [x, z, width, height, depth] = offsets[i];
        peak.position.set(x, -.035, z - hz - hx * .24);
        peak.scale.set(width, height, depth);
      });
    }

    const key = `${hx},${hz}`;
    if (island.visible && key !== islandSize) {
      const shore = islandShore(hx, hz);
      const horizon = Math.max(1500, Math.max(...shore.map(point => point.radius)) + 100);
      island.geometry.dispose();
      island.geometry = shoreGeometry(shore, [
        { offset: 0, height: waterHeight, color: 0x86c7b7 },
        { offset: 1.4, height: waterHeight, color: 0x65ad9e },
        { offset: 5.5, height: waterHeight, color: 0x3f8e97 },
        { offset: 15, height: waterHeight, color: 0x316883 },
        { offset: 0, height: waterHeight, color: 0x2e5e7d },
      ], { horizon });
      wetSand.geometry.dispose();
      wetSand.geometry = shoreGeometry(shore, [
        { offset: -1.45, height: .018, color: 0xc9b89a, alpha: 0 },
        { offset: -.42, height: .036, color: 0xa79472, alpha: .54 },
        { offset: -.08, height: .05, color: 0x8d8064, alpha: .74 },
        { offset: .14, height: .053, color: 0x7a785e, alpha: .7 },
      ]);
      foam.geometry.dispose();
      foam.geometry = shoreGeometry(shore, [
        { offset: .07, height: waterHeight + .008, color: 0xd2e5d9, alpha: 0 },
        { offset: .21, height: waterHeight + .008, color: 0xf0f8ef, alpha: .46 },
        { offset: .4, height: waterHeight + .008, color: 0xd7eae1, alpha: .14 },
        { offset: .72, height: waterHeight + .008, color: 0xc3e3de, alpha: 0 },
      ], { broken: true });
      islandSize = key;
    }
  }

  return { root, setTheme };
}
