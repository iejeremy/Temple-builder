import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import ts from 'typescript';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const module={exports:{}};
vm.runInNewContext(ts.transpile(readFileSync('src/components/builderGeometry.ts','utf8'),{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}),{module,exports:module.exports,require:name=>name==='three'?THREE:{mergeGeometries}});
const {batchBuildingShell,perimeterPlan}=module.exports;
test('shell batching preserves world bounds and independently selectable attachments',()=>{
 const group=new THREE.Group(),material=new THREE.MeshStandardMaterial();
 for(let i=0;i<100;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.9,1,.3),material);m.position.set(i%10,Math.floor(i/10),0);group.add(m);}
 const window=new THREE.Mesh(new THREE.BoxGeometry(1,1,.1),material);window.userData.detailCategory='windows';window.userData.detailId='keep';group.add(window);
 const before=new THREE.Box3().setFromObject(group);batchBuildingShell(group,material);
 assert.equal(group.children.length,2);assert.ok(group.children.includes(window));const after=new THREE.Box3().setFromObject(group);assert.ok(before.min.distanceTo(after.min)<1e-5&&before.max.distanceTo(after.max)<1e-5);
});
test('all perimeter styles enclose translated and rotated building corners',()=>{
 const levels=[{x:20,z:-12,width:56,depth:28,rotation:45},{x:25,z:-9,width:28,depth:40,rotation:20}];
 const inside=(x,z,polygon)=>{let odd=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [a,b]=polygon[i],[c,d]=polygon[j];if((b>z)!==(d>z)&&x<(c-a)*(z-b)/(d-b)+a)odd=!odd;}return odd;};
 for(const style of ['rectangle','circle','octagon','star']){
  const {points,center}=perimeterPlan(levels,1,style);assert.ok(center.x>15&&center.y<0);
  for(const l of levels)for(const x of [-l.width/14,l.width/14])for(const z of [-l.depth/14,l.depth/14]){
   const a=l.rotation*Math.PI/180;assert.ok(inside(l.x+Math.cos(a)*x+Math.sin(a)*z,l.z-Math.sin(a)*x+Math.cos(a)*z,points));
  }
 }
});
