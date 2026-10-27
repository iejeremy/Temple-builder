import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import * as THREE from 'three';

const code=ts.transpile(readFileSync('src/components/stoneSurface.ts','utf8'),{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS});
function fixture(){
 const tasks=[];let workers=0,disposed=0,redraws=0;
 class Loader{
  setTranscoderPath(path){assert.equal(path,'./basis/');return this;}
  setWorkerLimit(n){workers=n;return this;}
  detectSupport(renderer){assert.ok(renderer.capabilities);}
  loadAsync(url){return new Promise((resolve,reject)=>tasks.push({url,resolve,reject}));}
  dispose(){disposed++;}
 }
 const module={exports:{}};
 vm.runInNewContext(code,{module,exports:module.exports,require:name=>name==='three'?THREE:{KTX2Loader:Loader}});
 const controller=module.exports.createStoneSurface({capabilities:{getMaxAnisotropy:()=>2}},()=>redraws++);
 const root=new THREE.Group();
 const add=(kind='stone')=>{const material=new THREE.MeshStandardMaterial({map:new THREE.Texture(),bumpMap:new THREE.Texture()});material.userData.surfaceKind=kind;root.add(new THREE.Mesh(new THREE.BoxGeometry(),material));return material;};
 const finish=async(fail=-1)=>{const textures=tasks.map(()=>new THREE.Texture());tasks.forEach((task,i)=>i===fail?task.reject(Error('offline')):task.resolve(textures[i]));await new Promise(resolve=>setImmediate(resolve));return textures;};
 return {controller,root,add,tasks,finish,stats:()=>({workers,disposed,redraws})};
}
test('scanned stone is lazy, shared, correctly colored and never changes other materials or geometry',async()=>{
 const f=fixture(),marble=f.add('marble'),originalMarble=marble.map;f.controller.bind(f.root);assert.equal(f.tasks.length,0);
 const a=f.add(),b=f.add(),bump=a.bumpMap;const geometry=f.root.children.map(m=>m.geometry);f.controller.bind(f.root);f.controller.bind(f.root);
 assert.equal(f.tasks.length,3);assert.equal(f.stats().workers,1);const textures=await f.finish();
 assert.equal(a.map,b.map);assert.equal(a.map,textures[0]);assert.equal(a.map.colorSpace,THREE.SRGBColorSpace);assert.equal(a.normalMap.colorSpace,THREE.NoColorSpace);assert.equal(a.roughnessMap.colorSpace,THREE.NoColorSpace);
 assert.equal(a.map.anisotropy,2);assert.equal(a.map.wrapS,THREE.RepeatWrapping);assert.equal(a.bumpMap,bump);assert.equal(marble.map,originalMarble);
 assert.deepEqual(f.root.children.map(m=>m.geometry),geometry);assert.equal(f.stats().redraws,1);
 const late=f.add();f.controller.bind(f.root);assert.equal(late.map,a.map);assert.equal(f.tasks.length,3);
 let frees=0;textures.forEach(t=>t.addEventListener('dispose',()=>frees++));f.controller.dispose();f.controller.dispose();assert.equal(frees,3);
});
test('a failed map leaves the entire procedural fallback intact and frees partial results',async()=>{
 const f=fixture(),a=f.add(),map=a.map;f.controller.bind(f.root);
 let freed=0;f.tasks[0].resolve=(()=>{const resolve=f.tasks[0].resolve;return texture=>{texture.addEventListener('dispose',()=>freed++);resolve(texture);};})();
 await f.finish(1);assert.equal(a.map,map);assert.equal(a.normalMap,null);assert.equal(freed,1);assert.equal(f.stats().redraws,0);
 f.controller.bind(f.root);assert.equal(f.tasks.length,3);f.controller.dispose();
});
test('late results after unmount are released without touching the old scene or requesting a frame',async()=>{
 const f=fixture(),a=f.add(),map=a.map;f.controller.bind(f.root);f.controller.dispose();assert.equal(f.stats().disposed,0);
 let frees=0;f.tasks.forEach(task=>{const resolve=task.resolve;task.resolve=texture=>{texture.addEventListener('dispose',()=>frees++);resolve(texture);};});
 await f.finish();assert.equal(frees,3);assert.equal(a.map,map);assert.equal(f.stats().redraws,0);assert.equal(f.stats().disposed,1);
});
test('materials removed during decoding are not patched when loading completes',async()=>{
 const f=fixture(),old=f.add(),map=old.map;f.controller.bind(f.root);f.root.clear();const current=f.add();f.controller.bind(f.root);await f.finish();
 assert.equal(old.map,map);assert.equal(current.userData.scannedStone,true);f.controller.dispose();
});
test('all shipped stone maps have KTX2 mip chains within the fixed mobile download budget',()=>{
 let bytes=0;for(const name of ['color','normal','roughness']){
  const data=readFileSync(`public/materials/stone-wall-02/${name}.ktx2`);bytes+=data.length;
  assert.equal(data.subarray(0,12).toString('hex'),'ab4b5458203230bb0d0a1a0a');
  assert.equal(data.readUInt32LE(20),512);assert.equal(data.readUInt32LE(24),512);assert.equal(data.readUInt32LE(40),10);
 }
 assert.ok(bytes<450_000);
});
