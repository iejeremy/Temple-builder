import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import * as THREE from 'three';
const module={exports:{}};
vm.runInNewContext(ts.transpile(readFileSync('src/components/sceneryWater.ts','utf8'),{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}),{module,exports:module.exports,require:()=>THREE});
const {placedWaterCurve,waterGeometry,bankGeometry,createWaterMaterials,rippleGeometry}=module.exports;
test('placed water preserves its established centerline and length',()=>{
 const curve=placedWaterCurve(14);for(const t of [0,.13,.38,.5,.73,1]){const p=curve.getPoint(t);assert.ok(Math.abs(p.x-(Math.sin(t*Math.PI*2)*14*.11+Math.sin(t*Math.PI*4)*14*.025))<1e-10);assert.equal(p.z,(t-.5)*14);assert.equal(p.y,0);}
});
for(const [kind,width,length] of [['river',1.6,14],['creek',.55,10]])test(kind+' has upward surface normals, darker pools and feathered bank edges',()=>{
 const curve=placedWaterCurve(length),water=waterGeometry(curve,width),bank=bankGeometry(curve,width),normal=water.getAttribute('normal'),color=water.getAttribute('color'),alpha=bank.getAttribute('color');
 for(let i=0;i<normal.count;i++)assert.ok(normal.getY(i)>.99);
 for(let row=0;row<129;row++){const edge=row*7,center=edge+3;assert.ok(color.getX(center)+color.getY(center)+color.getZ(center)<color.getX(edge)+color.getY(edge)+color.getZ(edge));assert.equal(alpha.getW(row*9),0);assert.equal(alpha.getW(row*9+8),0);assert.equal(alpha.getW(row*9+4),1);}
 for(const g of [water,bank]){assert.ok(Array.from(g.attributes.position.array).every(Number.isFinite));g.computeBoundingBox();assert.ok(g.boundingBox.min.y>0);g.dispose();}
});
test('water remains nonmetallic and owns a small valid normal map that is released on disposal',()=>{
 const m=createWaterMaterials(),texture=m.water.normalMap,{data}=texture.image;
 assert.equal(m.water.metalness,0);assert.equal(m.water.transparent,false);assert.equal(texture.colorSpace,THREE.NoColorSpace);assert.equal(texture.wrapS,THREE.RepeatWrapping);assert.equal(texture.minFilter,THREE.LinearMipmapLinearFilter);assert.equal(texture.generateMipmaps,true);
 for(let i=0;i<data.length;i+=4){const length=Math.hypot(data[i]/255*2-1,data[i+1]/255*2-1,data[i+2]/255*2-1);assert.ok(Math.abs(length-1)<.02);assert.ok(data[i+2]>127);}
 let disposed=0;texture.addEventListener('dispose',()=>disposed++);m.water.dispose();m.water.dispose();assert.equal(disposed,1);m.bank.dispose();m.ripple.dispose();
});
test('ripple highlights are flat curved streaks instead of raised blocks',()=>{
 const g=rippleGeometry();g.computeBoundingBox();assert.equal(g.boundingBox.max.y-g.boundingBox.min.y,0);assert.ok(g.boundingBox.max.z-g.boundingBox.min.z<.2);const normal=g.getAttribute('normal');for(let i=0;i<normal.count;i++)assert.ok(normal.getY(i)>.99);g.dispose();
});
