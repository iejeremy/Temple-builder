import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import * as THREE from 'three';
const cache={};
function load(name){if(cache[name])return cache[name];const module={exports:{}};vm.runInNewContext(ts.transpile(readFileSync('src/components/'+name+'.ts','utf8'),{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}),{module,exports:module.exports,require:path=>path==='three'?THREE:load(path.slice(2))});cache[name]=module.exports;return module.exports;}
const {createEnvironmentLandscape}=load('environmentLandscape'),{addSceneryTree}=load('sceneryTrees');
for(const style of ['broadleaf','pine','cypress'])test(style+' tree has a full canopy, finite instances and grounded timber',()=>{
 const tree=addSceneryTree(new THREE.Group(),style,4);assert.equal(tree.children.length,2);assert.equal(tree.children[1].count,96);
 const box=new THREE.Box3().setFromObject(tree);assert.ok(box.min.y>=-.02&&box.max.y>3.5);
 tree.traverse(o=>{if(o.isInstancedMesh)assert.ok(Array.from(o.instanceMatrix.array).every(Number.isFinite));});
});
test('automatic scenery respects translated site clearing and leaves camera/editable bounds separate',()=>{
 const e=createEnvironmentLandscape(),bounds=new THREE.Box3(new THREE.Vector3(20,0,-12),new THREE.Vector3(36,9,0));e.setBounds(bounds);e.root.updateMatrixWorld(true);
 assert.deepEqual(e.root.position.toArray(),[28,0,-6]);const clearing=e.root.userData.clearing;
 const woodland=e.root.getObjectByName('environment-trees');assert.equal(woodland.children.length,54);
 const localClear=new THREE.Box3(new THREE.Vector3(-clearing.hx,0,-clearing.hz),new THREE.Vector3(clearing.hx,20,clearing.hz));
 for(const tree of woodland.children){if(!tree.visible)continue;const world=new THREE.Box3().setFromObject(tree);world.translate(e.root.position.clone().negate());assert.equal(localClear.intersectsBox(world),false);}
 for(const name of ['environment-river','environment-creek','environment-near-hills']){
  const mesh=e.root.getObjectByName(name);assert.ok(mesh);
  if(mesh.isInstancedMesh){const matrix=new THREE.Matrix4();for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);mesh.geometry.computeBoundingBox();assert.equal(localClear.intersectsBox(mesh.geometry.boundingBox.clone().applyMatrix4(matrix)),false);}}
  else{mesh.geometry.computeBoundingBox();assert.equal(localClear.intersectsBox(mesh.geometry.boundingBox),false);const normal=mesh.geometry.getAttribute('normal');for(let i=0;i<normal.count;i++)assert.ok(normal.getY(i)>.99);}
 }
 assert.ok(e.root.getObjectByName('environment-grass').count>=5000);assert.ok(e.root.getObjectByName('environment-boulders').count>=60);
 // Same extents reuse the geometry and only move the background with the site.
 const river=e.root.getObjectByName('environment-river'),geometry=river.geometry;e.setBounds(bounds.clone().translate(new THREE.Vector3(5,0,3)));assert.equal(river.geometry,geometry);
});
test('garden, desert and twilight preserve the existing theme choices',()=>{
 const e=createEnvironmentLandscape(),trees=e.root.getObjectByName('environment-trees'),water=e.root.getObjectByName('environment-river');
 e.setTheme('desert');assert.equal(trees.visible,false);assert.equal(water.visible,false);
 for(const theme of ['garden','twilight']){e.setTheme(theme);assert.equal(trees.visible,true);assert.equal(water.visible,true);}
});
