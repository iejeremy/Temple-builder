import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import ts from 'typescript';
const module={exports:{}};
vm.runInNewContext(ts.transpile(readFileSync('src/components/buildingTrim.ts','utf8'),{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}),{module,exports:module.exports,require:()=>THREE});
const {buildingTrimLoops,createBuildingTrim}=module.exports;
const page=readFileSync('src/app/page.tsx','utf8'),renderer=readFileSync('src/components/Temple3DPreview.tsx','utf8');
const shapes=page.match(/export type BuildingShape = ([^;]+);/)[1].match(/"[^"]+"/g).map(s=>JSON.parse(s));
const styles=page.match(/export type TrimStyle = ([^;]+);/)[1].match(/"[^"]+"/g).map(s=>JSON.parse(s));
const faces=['front','back','left','right'];
const distance=(p,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dz*t);};
test('every saved shape, face and trim style has finite, nonempty wall-attached geometry',()=>{
 for(const shape of shapes)for(const [w,d] of [[4,7],[8,3]]){
  const loops=buildingTrimLoops(shape,w,d),segments=loops.flatMap(loop=>loop.map((a,i)=>[a,loop[(i+1)%loop.length]]));
  for(const face of faces)for(const style of styles){
   const trim={id:'keep',face,style,u:.8},before=JSON.stringify(trim),geometry=createBuildingTrim(shape,w,d,trim),p=geometry.getAttribute('position'),n=geometry.getAttribute('normal');
   assert.ok(p.count>0,shape+' '+face);assert.equal(JSON.stringify(trim),before);assert.ok([...p.array,...n.array].every(Number.isFinite));
   for(let i=0;i<p.count;i++)assert.ok(Math.min(...segments.map(([a,b])=>distance([p.getX(i),p.getZ(i)],a,b)))<.65,shape+' trim escaped its wall');
   geometry.dispose();
  }
 }
});
test('compound trim follows the actual renderer rectangle union, with no hidden overlap seams',()=>{
 const parts=renderer.slice(renderer.indexOf('      const parts:'),renderer.indexOf('      const polygonShape='));
 for(const shape of ['rectangle','square','wide','l-shape','t-shape','u-shape','cross','x-shape','horseshoe','courtyard']){
  const context={level:{shape},w:6,d:4,result:null};vm.runInNewContext(ts.transpile(parts+'result=parts;',{target:ts.ScriptTarget.ES2020}),context);
  const inside=(x,z)=>context.result.some(([w,d,cx,cz])=>Math.abs(x-cx)<w/2&&Math.abs(z-cz)<d/2);
  for(const loop of buildingTrimLoops(shape,6,4))for(let i=0;i<loop.length;i++){
   const a=loop[i],b=loop[(i+1)%loop.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
   const x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,nx=dz/length*.00001,nz=-dx/length*.00001;
   assert.equal(inside(x-nx,z-nz),true,shape+' band lost contact');assert.equal(inside(x+nx,z+nz),false,shape+' band crosses an internal seam');
  }
 }
 assert.equal(buildingTrimLoops('courtyard',6,4).length,2);assert.equal(buildingTrimLoops('ring',6,4).length,2);
});
test('all four face bands meet around every outline without leaving wall-length gaps',()=>{
 const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),ray=new THREE.Raycaster();
 for(const shape of shapes){
  const meshes=faces.map(face=>new THREE.Mesh(createBuildingTrim(shape,6,4,{id:face,face,style:'crown',u:0}),material));meshes.forEach(m=>m.updateMatrixWorld());
  for(const loop of buildingTrimLoops(shape,6,4))for(let i=0;i<loop.length;i++){
   const a=loop[i],b=loop[(i+1)%loop.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
   for(const t of [.137,.5,.831]){ray.set(new THREE.Vector3(a[0]+dx*t+dz/length*.06,1,a[1]+dz*t-dx/length*.06),new THREE.Vector3(0,-1,0));assert.ok(ray.intersectObjects(meshes).length>0,shape+' uncovered wall');}
  }
  meshes.forEach(m=>m.geometry.dispose());
 }
 material.dispose();
});
test('round trims cannot form the old square frame and remain close to curved walls',()=>{
 for(const shape of ['circle','rotunda','ring'])for(const face of faces){
  const p=createBuildingTrim(shape,4,7,{id:'keep',face,style:'dentils',u:-1}).getAttribute('position');
  for(let i=0;i<p.count;i++){const r=Math.hypot(p.getX(i),p.getZ(i));assert.ok(r<2.25);assert.ok(r>.9);}
 }
});
test('ornament positioning changes within the outline without displacing the structural band',()=>{
 for(const shape of shapes){
  const make=u=>createBuildingTrim(shape,6,4,{id:'same',face:'front',style:'dentils',u}).getAttribute('position').array;
  const a=make(-1),b=make(1),ornaments=9*36*3;assert.equal(a.length,b.length);assert.deepEqual(a.slice(0,-ornaments),b.slice(0,-ornaments));assert.notDeepEqual(a.slice(-ornaments),b.slice(-ornaments));
 }
});
