import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createHash} from 'node:crypto';
const document={createElement(){const canvas={width:0,height:0};canvas.getContext=()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:image=>{canvas.pixels=image.data;}});return canvas;}};
function load(name){const module={exports:{}};vm.runInNewContext(ts.transpile(readFileSync('src/components/'+name+'.ts','utf8'),{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}),{module,exports:module.exports,require:path=>path==='three'?THREE:{mergeGeometries},document});return module.exports;}
const {getProceduralMaps,retainProceduralMaps}=load('builderMaterialMaps');
const {finishArchitecturalSurfaces}=load('architecturalSurfaces');
const {batchBuildingShell}=load('builderGeometry');
const {shadeBoulderSurface,shadeGrassSurface}=load('scenerySurfaces');
test('all fourteen finishes reuse compact maps with correct color spaces and controlled roughness',()=>{
 const release=retainProceduralMaps(),maps=[];
 for(const kind of ['marble','sandstone','limestone','travertine','granite','stone','brick','concrete','stucco','plaster','timber','bronze','gold','obsidian']){
  const surface=getProceduralMaps(kind);assert.equal(surface,getProceduralMaps(kind));maps.push(...Object.values(surface));
  for(const texture of Object.values(surface)){assert.equal(texture.image.width,256);assert.equal(texture.image.height,256);assert.equal(texture.wrapS,THREE.RepeatWrapping);}
  assert.equal(surface.color.colorSpace,THREE.SRGBColorSpace);assert.equal(surface.roughness.colorSpace,THREE.NoColorSpace);assert.equal(surface.bump.colorSpace,THREE.NoColorSpace);
  const rough=surface.roughness.image.pixels.filter((_,i)=>i%4===1);assert.ok(Math.min(...rough)>190,'Roughness map must not unintentionally turn the finish into a mirror');
 }
 const secondRelease=retainProceduralMaps(),disposed=new Set();maps.forEach(t=>t.addEventListener('dispose',()=>disposed.add(t)));release();assert.equal(disposed.size,0);secondRelease();assert.equal(disposed.size,42);secondRelease();assert.equal(disposed.size,42);
});
test('marble keeps fine low-contrast veins and shallow relief instead of dark raised contours',()=>{
 const release=retainProceduralMaps(),surface=getProceduralMaps('marble');
 const color=surface.color.image.pixels.filter((_,i)=>i%4===0),height=surface.bump.image.pixels.filter((_,i)=>i%4===0);
 assert.ok(Math.min(...color)>185);assert.ok(Math.max(...color)-Math.min(...color)>20);assert.ok(Math.max(...color)-Math.min(...color)<60);
 assert.ok(Math.max(...height)-Math.min(...height)<10);release();
});
test('surface mapping preserves vertex data, index data, bounds, tags and cached UV identity',()=>{
 const root=new THREE.Group(),material=new THREE.MeshStandardMaterial();material.userData.architecturalSurface=true;
 for(const geometry of [new THREE.BoxGeometry(.4,2,.2),new THREE.CylinderGeometry(.2,.25,3,24),new THREE.SphereGeometry(1,24,12)]){
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(2,1,-3);mesh.rotation.y=.4;mesh.userData.detailId='keep';root.add(mesh);
  const p=Array.from(geometry.getAttribute('position').array),n=Array.from(geometry.getAttribute('normal').array),index=Array.from(geometry.index.array),bounds=new THREE.Box3().setFromObject(mesh);
  finishArchitecturalSurfaces(root);const uv=geometry.getAttribute('uv');assert.ok(Array.from(uv.array).every(Number.isFinite));
  assert.deepEqual(Array.from(geometry.getAttribute('position').array),p);assert.deepEqual(Array.from(geometry.getAttribute('normal').array),n);assert.deepEqual(Array.from(geometry.index.array),index);
  assert.ok(bounds.equals(new THREE.Box3().setFromObject(mesh)));assert.equal(mesh.userData.detailId,'keep');mesh.position.x+=4;finishArchitecturalSurfaces(root);assert.equal(geometry.getAttribute('uv'),uv);
 }
 const box=new THREE.Mesh(new THREE.BoxGeometry(2.4,2.4,2.4),material);finishArchitecturalSurfaces(box);const uv=box.geometry.getAttribute('uv');
 assert.equal(Math.max(...uv.array)-Math.min(...uv.array),1,'One tile spans 2.4 local scene units');
});
test('shell batching retains mapped curved surfaces and separate interactive pieces',()=>{
 const group=new THREE.Group(),material=new THREE.MeshStandardMaterial();material.userData.architecturalSurface=true;
 for(let i=0;i<4;i++){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.2,.25,2,16),material);mesh.position.x=i;group.add(mesh);}
 const detail=new THREE.Mesh(new THREE.BoxGeometry(1,1,.1),material);detail.userData.detailCategory='windows';group.add(detail);
 finishArchitecturalSurfaces(group);batchBuildingShell(group,material);assert.equal(group.children.length,2);assert.ok(group.children.includes(detail));
 const shell=group.children.find(o=>o!==detail),uv=shell.geometry.getAttribute('uv');assert.equal(shell.geometry.userData.architecturalSurface,true);finishArchitecturalSurfaces(group);assert.equal(shell.geometry.getAttribute('uv'),uv);
});
test('protected camera, gestures, projection and framing remain byte-for-byte unchanged',()=>{
 const lock=JSON.parse(readFileSync('docs/CAMERA_LOCK_2026-10-25.json','utf8')),hash=text=>createHash('sha256').update(text).digest('hex');
 for(const entry of lock){let source=readFileSync(entry.path,'utf8');if(entry.start){assert.ok(source.includes(entry.start));assert.ok(source.includes(entry.end));source=source.slice(source.indexOf(entry.start),source.indexOf(entry.end));}for(const gate of entry.movementGateReplacements||[]){assert.equal(source.split(gate.current).length-1,1,'Expected one exact movement eligibility gate');source=source.replace(gate.current,gate.baseline);}assert.equal(hash(source),entry.sha256,entry.path+' camera protection changed');}
});
test('boulder mineral colors are deterministic and preserve shape, bounds and seam colors',()=>{
 const geometry=new THREE.IcosahedronGeometry(1,2),original=Array.from(geometry.getAttribute('position').array);geometry.computeBoundingBox();const before=geometry.boundingBox.clone();
 shadeBoulderSurface(geometry);const colors=Array.from(geometry.getAttribute('color').array);assert.ok(colors.every(n=>Number.isFinite(n)&&n>.5&&n<1.2));assert.ok(Math.max(...colors)-Math.min(...colors)>.15);
 assert.deepEqual(Array.from(geometry.getAttribute('position').array),original);assert.ok(before.equals(geometry.boundingBox));shadeBoulderSurface(geometry);assert.deepEqual(Array.from(geometry.getAttribute('color').array),colors);
 const positions=geometry.getAttribute('position'),seams=new Map();for(let i=0;i<positions.count;i++){const key=[positions.getX(i),positions.getY(i),positions.getZ(i)].join(','),color=colors.slice(i*3,i*3+3);if(seams.has(key))assert.deepEqual(color,seams.get(key));else seams.set(key,color);}
});
test('grass tip gradient preserves the original blade positions and triangle count',()=>{
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([-.035,0,0,.035,0,0,.075,.45,.025],3));const before=Array.from(geometry.getAttribute('position').array);
 shadeGrassSurface(geometry);assert.deepEqual(Array.from(geometry.getAttribute('position').array),before);assert.equal(geometry.getAttribute('position').count,3);const color=geometry.getAttribute('color');for(let c=0;c<3;c++)assert.ok(color.array[6+c]>color.array[c]);
});
