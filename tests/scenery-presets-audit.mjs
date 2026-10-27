import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import * as THREE from 'three';
const cache={};
function load(name){if(cache[name])return cache[name];const module={exports:{}};vm.runInNewContext(ts.transpile(readFileSync('src/components/'+name+'.ts','utf8'),{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}),{module,exports:module.exports,require:path=>path==='three'?THREE:load(path.slice(2))});cache[name]=module.exports;return module.exports;}
const {sceneryPresets,sceneryThemes,isSceneryTheme}=load('sceneryPresets');
const {createEnvironmentLandscape}=load('environmentLandscape');
test('six stable scenery choices include the existing themes and reject unknown saved values',()=>{
 assert.deepEqual(Array.from(sceneryThemes),['garden','desert','twilight','autumn','alpine','coast']);
 for(const id of sceneryThemes){assert.ok(isSceneryTheme(id));assert.ok(sceneryPresets[id].name);assert.ok(sceneryPresets[id].description);}
 for(const bad of ['constructor','toString','unknown',null,{},6])assert.equal(isSceneryTheme(bad),false);
});
test('scenery cycles restore the exact garden layout and fine-leaf colors without growing tree counts',()=>{
 const env=createEnvironmentLandscape(),trees=env.root.getObjectByName('environment-trees');
 const transforms=trees.children.map(t=>({p:t.position.toArray(),s:t.scale.toArray(),r:t.rotation.toArray()}));
 const originalColors=trees.children.map(t=>Array.from(t.children[1].instanceColor.array));
 const originalBuffers=['environment-grass','environment-boulders','environment-near-hills'].map(name=>Array.from(env.root.getObjectByName(name).instanceMatrix.array));
 for(let cycle=0;cycle<2;cycle++)for(const id of sceneryThemes){
  env.setTheme(id);assert.equal(trees.children.length,54);
  trees.children.forEach((tree,i)=>{assert.deepEqual({p:tree.position.toArray(),s:tree.scale.toArray(),r:tree.rotation.toArray()},transforms[i]);assert.ok(tree.children[1].count>=300);});
 }
 env.setTheme('garden');
 trees.children.forEach((t,i)=>assert.deepEqual(Array.from(t.children[1].instanceColor.array),originalColors[i]));
 ['environment-grass','environment-boulders','environment-near-hills'].forEach((name,i)=>assert.deepEqual(Array.from(env.root.getObjectByName(name).instanceMatrix.array),originalBuffers[i]));
 env.dispose();
});
test('new sceneries change habitats: autumn foliage, alpine pines and a coastal sea',()=>{
 const env=createEnvironmentLandscape(),trees=env.root.getObjectByName('environment-trees');
 const original=Array.from(trees.children[0].children[1].instanceColor.array);
 env.setTheme('autumn');assert.notDeepEqual(Array.from(trees.children[0].children[1].instanceColor.array),original);
 env.setTheme('alpine');assert.ok(trees.children.filter(t=>t.userData.treeStyle==='pine').length>40);assert.ok(sceneryPresets.alpine.hills>2);
 env.setTheme('coast');assert.ok(trees.children.every(t=>t.userData.treeStyle==='cypress'));assert.equal(env.root.getObjectByName('environment-coast-water').visible,true);assert.equal(env.root.getObjectByName('environment-river').visible,false);
 env.setTheme('desert');assert.equal(trees.visible,false);assert.equal(env.root.getObjectByName('environment-coast-water').visible,false);
 env.setTheme('twilight');assert.equal(trees.visible,true);assert.equal(env.root.getObjectByName('environment-river').visible,true);env.dispose();
});
test('coastal sea stays outside moved/wide building clearings and dry scenery cannot float over it',()=>{
 const env=createEnvironmentLandscape(),matrix=new THREE.Matrix4();env.setTheme('coast');
 for(const bounds of [new THREE.Box3(),new THREE.Box3(new THREE.Vector3(30,0,-20),new THREE.Vector3(65,15,12))]){
  env.setBounds(bounds);const sea=env.root.getObjectByName('environment-coast-water'),shore=env.root.userData.clearing.hz+7;
  sea.geometry.computeBoundingBox();assert.ok(sea.geometry.boundingBox.min.z+sea.position.z>=shore-1e-6);
  assert.ok(shore>env.root.userData.clearing.hz+5);
  for(const name of ['environment-grass','environment-boulders','environment-near-hills']){
   const mesh=env.root.getObjectByName(name);mesh.geometry.computeBoundingBox();
   for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);if(Math.abs(matrix.determinant())<1e-10)continue;const b=mesh.geometry.boundingBox.clone().applyMatrix4(matrix);assert.ok(b.max.z<shore,'Keep dry scenery off the sea');}
  }
 }
 env.dispose();
});
