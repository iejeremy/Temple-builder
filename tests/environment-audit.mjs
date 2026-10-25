import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import * as THREE from 'three';
const cache={};
function load(name){if(cache[name])return cache[name];const module={exports:{}};vm.runInNewContext(ts.transpile(readFileSync('src/components/'+name+'.ts','utf8'),{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}),{module,exports:module.exports,require:path=>path==='three'?THREE:load(path.slice(2))});cache[name]=module.exports;return module.exports;}
const {createEnvironmentLandscape}=load('environmentLandscape'),{addSceneryTree}=load('sceneryTrees');
for(const style of ['broadleaf','pine','cypress'])test(style+' tree preserves hundreds of small leaves, finite instances and grounded timber',()=>{
 const tree=addSceneryTree(new THREE.Group(),style,4);assert.equal(tree.children.length,2);
 const leaves=tree.children[1];assert.ok(leaves.count>=300);
 assert.ok((leaves.geometry.index?.count||leaves.geometry.attributes.position.count)/3*leaves.count<=7680,'Fine foliage must fit within the previous tree triangle budget');
 const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
 for(let i=0;i<leaves.count;i++){leaves.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);assert.ok(Math.max(scale.x,scale.y,scale.z)<=.19,'Individual foliage must stay small, rather than becoming large canopy clumps');}
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

test('groves, buried rocks and bank grasses preserve open building space and instancing budgets',()=>{
 const e=createEnvironmentLandscape(),matrix=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();
 for(const bounds of [new THREE.Box3(),new THREE.Box3(new THREE.Vector3(20,0,-12),new THREE.Vector3(36,9,0)),new THREE.Box3(new THREE.Vector3(-32,0,-8),new THREE.Vector3(32,20,8))]){
  e.setBounds(bounds);const {hx,hz}=e.root.userData.clearing,woodland=e.root.getObjectByName('environment-trees');
  const clearing=new THREE.Box3(new THREE.Vector3(-hx,0,-hz),new THREE.Vector3(hx,20,hz));
  const trees=woodland.children.filter(t=>t.visible);assert.ok(trees.length>=48,'Keep the woodland populated');
  const scales=trees.map(t=>t.scale.x);assert.ok(Math.max(...scales)-Math.min(...scales)>.5);
  assert.ok(trees.filter(t=>trees.some(other=>other!==t&&other.position.distanceTo(t.position)<4)).length>trees.length*.65,'Most trees belong to loose groves');
  const rocks=e.root.getObjectByName('environment-boulders');assert.equal(rocks.count,64);rocks.geometry.computeBoundingBox();
  for(let i=0;i<rocks.count;i++){
   rocks.getMatrixAt(i,matrix);const box=rocks.geometry.boundingBox.clone().applyMatrix4(matrix);
   assert.ok(box.min.y<-.02&&box.max.y>.07,'Boulders are partly buried with exposed tops');
   assert.equal(clearing.intersectsBox(box),false,'Rock footprints must stay outside the building area');
  }
  const grass=e.root.getObjectByName('environment-grass');assert.equal(grass.count,5600);grass.geometry.computeBoundingBox();
  const courses=['environment-river','environment-creek'].map(name=>{
   const positions=e.root.getObjectByName(name).geometry.getAttribute('position'),points=[];
   for(let i=0;i<positions.count;i+=7)points.push({x:positions.getX(i+3),z:positions.getZ(i+3),radius:Math.hypot(positions.getX(i+6)-positions.getX(i),positions.getZ(i+6)-positions.getZ(i))*.5});
   return points;
  });
  const distanceFromBank=p=>{
   let edge=Infinity;
   for(const points of courses)for(let j=1;j<points.length;j++){
    const a=points[j-1],b=points[j],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz)));
    edge=Math.min(edge,Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t)-(a.radius+(b.radius-a.radius)*t));
   }
   return edge;
  };
  const hills=e.root.getObjectByName('environment-near-hills');
  for(let i=0;i<hills.count;i++){
   hills.getMatrixAt(i,matrix);matrix.decompose(p,q,s);const radius=4*Math.max(s.x,s.z);
   assert.ok(distanceFromBank(p)>radius+.35,'Hills cannot cover waterways');
   for(const tree of trees)assert.ok(tree.position.distanceTo(p)>radius+2,'Hills cannot bury tree trunks');
  }
  const near=[],dry=[];
  for(let i=0;i<grass.count;i++){
   grass.getMatrixAt(i,matrix);if(matrix.determinantAffine()===0)continue;matrix.decompose(p,q,s);
   assert.equal(clearing.intersectsBox(grass.geometry.boundingBox.clone().applyMatrix4(matrix)),false,'Grass must not intrude into the clearing');
   const edge=distanceFromBank(p);
   assert.ok(edge>.2,`Visible grass stays on dry banks: ${edge} at ${p.x},${p.z}; height ${s.y}`);
   if(edge<2)near.push(s.y);if(edge>5)dry.push(s.y);
  }
  assert.ok(near.length>400&&dry.length>400,'Both bank and dry habitats remain visible');
  const mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;assert.ok(mean(near)>mean(dry)*1.25,'Bank grasses are taller on average');
 }
});

test('ecological placement is deterministic and translations reuse all instance buffers',()=>{
 const a=createEnvironmentLandscape(),b=createEnvironmentLandscape();
 for(const name of ['environment-grass','environment-boulders','environment-near-hills']){
  const first=a.root.getObjectByName(name),other=b.root.getObjectByName(name);assert.deepEqual(first.instanceMatrix.array,other.instanceMatrix.array);
  const buffer=first.instanceMatrix.array,values=buffer.slice();a.setBounds(new THREE.Box3(new THREE.Vector3(15,0,15),new THREE.Vector3(25,5,25)));
  assert.equal(first.instanceMatrix.array,buffer);assert.deepEqual(buffer,values);
 }
});

test('hills have asymmetric slopes, a flat eased edge and the existing footprint',()=>{
 const group=new THREE.Group();load('naturalScenery').addNaturalScenery(group,{kind:'hill'});
 const geometry=group.children[0].geometry,positions=geometry.getAttribute('position'),colors=geometry.getAttribute('color');
 assert.equal(colors.itemSize,4);assert.equal(colors.getW(0),1);
 assert.equal(positions.count,17*49);assert.ok(positions.getY(8*49)>positions.getY(8*49+24));
 for(let i=15*49;i<positions.count;i++)assert.ok(positions.getY(i)<.02,'Outer slope joins the flat ground gently');
 for(let i=16*49;i<positions.count;i++){assert.ok(Math.abs(positions.getY(i)-.012)<1e-6);assert.equal(colors.getW(i),0,'Hill edge feathers into the underlying ground');}
 assert.ok(Array.from(colors.array).every(v=>Number.isFinite(v)&&v>=0&&v<=1));
 geometry.computeBoundingBox();assert.ok(geometry.boundingBox.min.x>=-4&&geometry.boundingBox.max.x<=4&&geometry.boundingBox.max.y>1.9);
});
