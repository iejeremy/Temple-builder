import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import * as THREE from 'three';
const cache={};
function load(name){if(cache[name])return cache[name];const module={exports:{}};vm.runInNewContext(ts.transpile(readFileSync('src/components/'+name+'.ts','utf8'),{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}),{module,exports:module.exports,require:path=>path==='three'?THREE:load(path.slice(2))});cache[name]=module.exports;return module.exports;}
const {addNaturalScenery,waterRibbon}=load('naturalScenery');
for(const kind of ['boulder','grass','hill','river','creek'])test(kind+' creates finite selectable geometry above ground',()=>{
 const g=new THREE.Group();g.userData.siteObjectId=kind;
 assert.equal(addNaturalScenery(g,{id:kind,kind}),true);assert.ok(g.children.length>0);
 const bounds=new THREE.Box3().setFromObject(g);assert.ok(Number.isFinite(bounds.min.x)&&bounds.max.y>0);assert.ok(bounds.min.y>=-.02);
 g.traverse(o=>{if(!o.geometry)return;const pos=o.geometry.getAttribute('position');for(let i=0;i<pos.count;i++)assert.ok(Number.isFinite(pos.getX(i))&&Number.isFinite(pos.getY(i))&&Number.isFinite(pos.getZ(i)));});
 if(kind==='grass'){assert.ok(g.children.some(o=>o.isInstancedMesh&&o.count===240));assert.ok(g.children.some(o=>o.userData.pickSurface));}
 if(kind==='hill')assert.ok(bounds.max.y>1.9);
});
test('water ribbon has upward normals and distinct river/creek widths',()=>{
 const geometry=waterRibbon(1.6,14,.065),normal=geometry.getAttribute('normal');
 for(let i=0;i<normal.count;i++)assert.ok(normal.getY(i)>.99);
 const river=new THREE.Group(),creek=new THREE.Group();addNaturalScenery(river,{kind:'river'});addNaturalScenery(creek,{kind:'creek'});
 const a=new THREE.Box3().setFromObject(river),b=new THREE.Box3().setFromObject(creek);assert.ok(a.getSize(new THREE.Vector3()).z>b.getSize(new THREE.Vector3()).z);
});
test('legacy scenery continues through the established render path',()=>{assert.equal(addNaturalScenery(new THREE.Group(),{kind:'tree'}),false);});

test('all six companion counterparts have finite grounded 3D geometry and retain site picking identity',()=>{for(const companionStyle of ['dog','cat','rabbit','fox','bird','tortoise']){const g=new THREE.Group();g.userData.siteObjectId='owned-pet';assert.equal(addNaturalScenery(g,{kind:'companion',companionStyle}),true);const b=new THREE.Box3().setFromObject(g);assert.ok(b.min.y>=-.001&&b.max.y>0);assert.equal(g.userData.siteObjectId,'owned-pet');g.traverse(o=>{if(o.geometry)assert.ok([...o.geometry.getAttribute('position').array].every(Number.isFinite));});}});
