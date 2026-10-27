import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import * as THREE from 'three';
const module={exports:{}};
const document={createElement(){const canvas={width:0,height:0};canvas.getContext=()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:image=>{canvas.pixels=image.data;}});return canvas;}};
vm.runInNewContext(ts.transpile(readFileSync('src/components/naturalLighting.ts','utf8'),{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}),{module,exports:module.exports,require:()=>THREE,document});
const {groundColor,createGroundSurface,outdoorRadiance,contactShadowTexture,createTerrainMaterial,distantTerrainGeometry}=module.exports;
test('ground colors are deterministic, bounded and varied in each theme',()=>{
 for(const theme of ['garden','desert','twilight']){const colors=[];for(let z=-50;z<=50;z+=3)for(let x=-50;x<=50;x+=3){const color=groundColor(x,z,theme);assert.equal(color.length,3);assert.ok(color.every(n=>Number.isInteger(n)&&n>=0&&n<=255));assert.deepEqual(color,groundColor(x,z,theme));colors.push(color.join(','));}assert.ok(new Set(colors).size>64,'Ground must retain visible variation rather than a single flat color');}
});
test('terrain maps keep color and surface data in their correct color spaces and share cached textures',()=>{
 const surface=createGroundSurface(4),garden=surface.map('garden'),desert=surface.map('desert');
 assert.equal(surface.map('twilight'),garden);assert.equal(surface.map('garden'),garden);assert.notEqual(desert,garden);
 assert.equal(garden.colorSpace,THREE.SRGBColorSpace);assert.equal(surface.bump.colorSpace,THREE.NoColorSpace);assert.equal(surface.roughness.colorSpace,THREE.NoColorSpace);
 assert.ok(surface.bump.repeat.x>garden.repeat.x);assert.ok(surface.roughness.image.pixels.every((n,i)=>i%4===3?n===255:n>=225));
 const textures=[garden,desert,surface.bump,surface.roughness,surface.detail],disposed=new Set();textures.forEach(t=>t.addEventListener('dispose',()=>disposed.add(t)));surface.dispose();assert.equal(disposed.size,textures.length);
});
test('outdoor reflection maps have finite linear radiance with sky above ground',()=>{
 let daylight=0,evening=0;
 for(const theme of ['garden','desert','twilight']){const texture=outdoorRadiance(theme),{data,width,height}=texture.image;assert.equal(texture.colorSpace,THREE.LinearSRGBColorSpace);assert.equal(texture.mapping,THREE.EquirectangularReflectionMapping);assert.ok(Array.from(data).every(Number.isFinite));
  for(let i=0;i<data.length;i+=4){assert.ok(data[i]>=0&&data[i+1]>=0&&data[i+2]>=0);assert.equal(data[i+3],1);if(theme==='garden')daylight+=data[i]+data[i+1]+data[i+2];if(theme==='twilight')evening+=data[i]+data[i+1]+data[i+2];}
  const top=(height-1)*width*4;assert.ok(data[top+2]>data[2],'Upper sky must remain above the reflected ground');texture.dispose();
 }
 assert.ok(evening<daylight);
});
test('contact shadows fade to zero at their edge without an opaque square',()=>{
 const texture=contactShadowTexture(),{data,width,height}=texture.image;const alpha=(x,y)=>data[(y*width+x)*4+3];
 assert.ok(alpha(width/2,height/2)>160);for(let x=0;x<width;x++){assert.equal(alpha(x,0),0);assert.equal(alpha(x,height-1),0);}for(let y=0;y<height;y++){assert.equal(alpha(0,y),0);assert.equal(alpha(width-1,y),0);}texture.dispose();
});

test('terrain detail shares a compact periodic tile and keeps standard PBR lighting/shadows',()=>{
 const surface=createGroundSurface(4),material=createTerrainMaterial(surface);
 assert.equal(surface.detail.image.width,128);assert.equal(surface.detail.image.height,128);assert.equal(surface.detail.colorSpace,THREE.NoColorSpace);assert.equal(surface.detail.wrapS,THREE.RepeatWrapping);
 const pixels=surface.detail.image.pixels;assert.ok(new Set(pixels).size>80);assert.ok(Array.from(pixels).every(n=>n>50&&n<200));
 const shader={uniforms:{},fragmentShader:'#include <map_pars_fragment>\n#include <map_fragment>\n#include <lights_fragment_begin>'};material.onBeforeCompile(shader);
 assert.equal(shader.uniforms.terrainDetail.value,surface.detail);assert.ok(shader.fragmentShader.includes('#include <lights_fragment_begin>'));assert.ok(shader.fragmentShader.includes('vMapUv*96.0'));assert.ok(shader.fragmentShader.includes('closeDetail.a*2.0'));
 assert.equal(material.displacementMap,null);assert.equal(material.metalness,0);assert.equal(material.map,surface.map('garden'));surface.dispose();material.dispose();
});
test('distant terrain has seamless rolling relief and preserves the flat inner building plane',()=>{
 const geometry=distantTerrainGeometry(),p=geometry.getAttribute('position'),uv=geometry.getAttribute('uv'),n=geometry.getAttribute('normal');
 assert.ok(p.count<4500);assert.ok(Array.from(p.array).every(Number.isFinite));assert.ok(Array.from(n.array).every(Number.isFinite));
 for(let ring=0;ring<=32;ring++){
  const a=ring*129,b=a+128;for(let c=0;c<3;c++)assert.equal(p.array[a*3+c],p.array[b*3+c]);
  for(let i=0;i<129;i++){const k=a+i,r=Math.hypot(p.getX(k),p.getZ(k));assert.ok(r>=47.999&&r<=120.001);assert.ok(n.getY(k)>0);assert.ok(Math.abs(uv.getX(k)-(p.getX(k)/256+.5))<1e-6);if(ring===0||ring===32)assert.ok(Math.abs(p.getY(k)+.04)<1e-6);}
 }
 const heights=Array.from({length:128},(_,i)=>p.getY(16*129+i));assert.ok(Math.max(...heights)-Math.min(...heights)>2.5);geometry.dispose();
});
