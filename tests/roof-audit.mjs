// Run the production building/roof construction and cache paths with real Three.js.
// No WebGL, browser gestures or deployed-device coverage is implied by this suite.
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import ts from 'typescript';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const source=readFileSync(process.env.AUDIT_SOURCE||'src/components/Temple3DPreview.tsx','utf8');
const page=readFileSync('src/app/page.tsx','utf8');
const compile=text=>ts.transpile(text,{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS});
const load=path=>{
  const module={exports:{}};
  vm.runInNewContext(compile(readFileSync(path,'utf8')),{module,exports:module.exports,require:name=>name==='three'?THREE:{mergeGeometries}});
  return module.exports;
};
const construction=new vm.Script(compile('(()=>{'+
  source.slice(source.indexOf('    const cache=geometryCacheRef.current;'),source.indexOf('    // Independent site columns'))
+'})()'));
const helpers=compile(source.slice(source.indexOf('const COLORS:'),source.indexOf('/** Convert pointer coordinates')));
const dispose=root=>root.traverse(o=>{if(o.isMesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});
function studio(){
  const group=new THREE.Group();
  const context=vm.createContext({
    THREE,group,geometryCacheRef:{current:new Map()},levelGroupsRef:{current:[]},
    levels:[],pendingLevelIndex:null,selectedLevel:0,liveRef:{current:{}},
    getProceduralMaps:()=>null,queueMicrotask:()=>{},disposeMeshResources:dispose,
    ...load('src/components/builderGeometry.ts'),...load('src/components/architecturalSurfaces.ts'),...load('src/components/buildingTrim.ts')
  });
  vm.runInContext(helpers,context);
  return {
    context,
    render(levels,selectedLevel=0){
      context.levels=levels;context.selectedLevel=selectedLevel;
      construction.runInContext(context);group.updateMatrixWorld(true);
      return context.levelGroupsRef.current;
    },
    dispose(){dispose(group);}
  };
}
const level=(shape,roof='tiered',extra={})=>({id:'base',buildingId:'owner',shape,roof,material:'stucco',width:42,depth:28,height:21,elevation:0,x:0,z:0,rotation:0,patio:false,windows:[],doors:[],arches:[],columns:[],trims:[],stairs:[],pediments:[],...extra});
const roofs=group=>group.children.filter(o=>o.userData.detailCategory==='roof');
const requested=['square','circle','star','triangle','l-shape','t-shape'];
const points=(count,r,inner)=>Array.from({length:inner?count*2:count},(_,i)=>{
  const a=-Math.PI/2+i*2*Math.PI/(inner?count*2:count),radius=inner&&i%2?inner:r;
  // A +PI/2 X rotation maps profile Y to world Z and extrusion depth downwards.
  return [Math.cos(a)*radius,Math.sin(a)*radius];
});
const outlines=(shape,w,d)=>{
  if(shape==='star'){const r=Math.min(w,d)*.52;return [points(5,r,r*.46)];}
  if(shape==='triangle')return [points(3,Math.min(w,d)*.52)];
  if(shape==='circle')return [points(32,Math.min(w,d)*.5)];
  const rectangles=shape==='l-shape'?[[w*.42,d,-w*.29,0],[w*.72,d*.42,w*.14,d*.29]]:shape==='t-shape'?[[w,d*.38,0,d*.30],[w*.36,d*.76,0,-d*.12]]:[[w,d,0,0]];
  return rectangles.map(([rw,rd,x,z])=>[[-rw/2+x,-rd/2+z],[rw/2+x,-rd/2+z],[rw/2+x,rd/2+z],[-rw/2+x,rd/2+z]]);
};
const close=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-5,`${label}: ${a} != ${b}`);

test('all saved shapes and roof styles build finite geometry and keep roofs independently selectable after batching',()=>{
  const shapes=page.match(/export type BuildingShape = ([^;]+);/)[1].match(/"[^"]+"/g).map(JSON.parse);
  const styles=page.match(/export type RoofStyle = ([^;]+);/)[1].match(/"[^"]+"/g).map(JSON.parse);
  for(const shape of shapes)for(const roof of styles){
    const s=studio(),[g]=s.render([level(shape,roof)]),pieces=roofs(g);
    assert.equal(pieces.length>0,roof!=='none',`${shape}/${roof}: roof picking identity`);
    g.traverse(o=>{if(o.isMesh)for(const name of ['position','normal'])assert.ok([...o.geometry.getAttribute(name).array].every(Number.isFinite),`${shape}/${roof}: ${name}`);});
    for(const mesh of pieces)assert.equal(mesh.userData.levelIndex,0);
    s.dispose();
  }
});

test('tiered base roofs cover the supporting footprints at wide, deep and small sizes, on elevated and rotated levels',()=>{
  for(const shape of requested)for(const [width,depth] of [[42,28],[21,56],[14,14]])for(const rotation of [0,37,90]){
    const s=studio(),l=level(shape,'tiered',{width,depth,rotation,x:3,z:-4,elevation:14}),[g]=s.render([l]);
    const top=(l.height+l.elevation)/7,basePieces=roofs(g).filter(m=>{const b=new THREE.Box3().setFromObject(m);return b.min.y<top+.04&&b.max.y>top+.20;});
    assert.ok(basePieces.length,`${shape}: first tier missing`);
    const loops=outlines(shape,width/7,depth/7);
    assert.equal(roofs(g).length,loops.length*5,shape+': four tiers and a crown per roof section');
    // Check all tier outlines, including the independent shrinking L/T sections.
    for(const loop of loops)for(let tier=0;tier<4;tier++){
      const scale=1-tier*.19,cx=loop.reduce((sum,p)=>sum+p[0],0)/loop.length,cz=loop.reduce((sum,p)=>sum+p[1],0)/loop.length;
      const expected=loop.map(([x,z])=>[cx+(x-cx)*scale,cz+(z-cz)*scale]);
      const candidates=roofs(g).filter(mesh=>{
        mesh.updateMatrix();const p=mesh.geometry.getAttribute('position'),vertices=[];
        for(let i=0;i<p.count;i++)vertices.push(new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrix));
        if(Math.abs(Math.max(...vertices.map(v=>v.y))-(top+.21+tier*.38))>1e-5)return false;
        return expected.every(([x,z])=>vertices.some(v=>Math.hypot(v.x-x,v.z-z)<1e-5));
      });
      assert.equal(candidates.length,1,`${shape}: tier ${tier+1} contour`);
    }
    const matrix=g.matrixWorld,ray=new THREE.Raycaster();
    for(const loop of loops)for(let i=0;i<loop.length;i++){
      const a=loop[i],b=loop[(i+1)%loop.length],cx=loop.reduce((sum,p)=>sum+p[0],0)/loop.length,cz=loop.reduce((sum,p)=>sum+p[1],0)/loop.length;
      const p=new THREE.Vector3((a[0]+b[0])*.495+cx*.01,top+1,(a[1]+b[1])*.495+cz*.01).applyMatrix4(matrix);
      ray.set(p,new THREE.Vector3(0,-1,0));assert.ok(ray.intersectObjects(basePieces).length,`${shape}/${width}/${depth}/${rotation}: uncovered eave`);
    }
    s.dispose();
  }
});

test('polygon pyramids use the same oriented eaves as their walls and face outward',()=>{
  for(const shape of ['star','triangle'])for(const [width,depth] of [[42,28],[21,56]]){
    const s=studio(),l=level(shape,'pyramid',{width,depth}),[g]=s.render([l]),pieces=roofs(g);
    assert.equal(pieces.length,1,shape+' pyramid must remain independently pickable');
    const mesh=pieces[0],position=mesh.geometry.getAttribute('position'),normal=mesh.geometry.getAttribute('normal'),top=l.height/7;
    const expected=outlines(shape,width/7,depth/7)[0];
    for(let i=0;i<position.count;i++){
      assert.ok(normal.getY(i)>0,shape+' outward roof normal');
      if(Math.abs(position.getY(i)-top)<1e-5)assert.ok(expected.some(([x,z])=>Math.hypot(position.getX(i)-x,position.getZ(i)-z)<1e-5),shape+' detached eave');
    }
    const ray=new THREE.Raycaster();ray.set(new THREE.Vector3(expected[0][0]*.9,top+3,expected[0][1]*.9),new THREE.Vector3(0,-1,0));
    assert.ok(ray.intersectObjects(pieces).length,shape+' roof must be visible/pickable from above');
    s.dispose();
  }
});

test('resize, roof/shape/elevation changes invalidate only that level; translation and rotation reuse its attached roof',()=>{
  for(const shape of requested){
    const s=studio(),a=level(shape),b=level('square','flat',{id:'other',buildingId:'other',x:20});
    const [initial,other]=s.render([a,b]);
    const moved={...a,x:5,z:-7,rotation:67};const [transformed]=s.render([moved,b]);
    assert.equal(transformed,initial);assert.equal(roofs(transformed)[0].parent,transformed);
    close(transformed.rotation.y,67*Math.PI/180,'rotation');close(transformed.position.x,5,'translation');
    let previous=transformed;
    for(const patch of [{width:63},{depth:49},{height:35},{elevation:28},{roof:'flat'},{shape:'triangle'}]){
      const next={...moved,...patch},[changed,untouched]=s.render([next,b]);
      assert.notEqual(changed,previous);assert.equal(untouched,other);assert.ok(roofs(changed).length);
      const roofBounds=new THREE.Box3();roofs(changed).forEach(m=>roofBounds.union(new THREE.Box3().setFromObject(m)));
      assert.ok(roofBounds.min.y>=(next.elevation+next.height)/7-.01);
      previous=changed;
    }
    const [reindexed]=s.render([b]);assert.equal(reindexed,other);
    for(const m of roofs(reindexed))assert.equal(m.userData.levelIndex,0,'roof still points to deleted level index');
    s.dispose();
  }
});

test('selection highlighting changes no roof vertices, transforms or geometry identities',()=>{
  const highlight=source.slice(source.indexOf('    selectionBoundsRef.current();',source.indexOf('// Selection highlighting')),source.indexOf('  },[selectedLevel,levels]);'));
  for(const shape of requested){
    const s=studio(),[a,b]=s.render([level(shape),level('circle','tiered',{id:'upper',elevation:21,width:28,depth:21})]);
    const meshes=[...roofs(a),...roofs(b)],before=meshes.map(m=>({geometry:m.geometry,vertices:Array.from(m.geometry.getAttribute('position').array),matrix:m.matrixWorld.toArray()}));
    Object.assign(s.context,{selectionBoundsRef:{current(){}},sceneRef:{current:null},rendererRef:{current:null},cameraRef:{current:null},selectedLevel:1});
    vm.runInContext(compile(highlight),s.context);
    meshes.forEach((m,i)=>{assert.equal(m.geometry,before[i].geometry);assert.deepEqual(Array.from(m.geometry.getAttribute('position').array),before[i].vertices);assert.deepEqual(m.matrixWorld.toArray(),before[i].matrix);});
    s.dispose();
  }
});

test('production level add/remove handlers preserve roof styles, ownership, rotation and remaining customizations',()=>{
  const handlers=page.slice(page.indexOf('  const removeSelectedLevel ='),page.indexOf('  const chooseShape ='));
  const add=new vm.Script(compile('(()=>{'+handlers+';addLevelToSelectedBuilding();})()'));
  const remove=new vm.Script(compile('(()=>{'+handlers+';removeSelectedLevel();})()'));
  for(const shape of requested){
    const s=studio(),base=level(shape,'tiered',{rotation:37}),middle=level(shape,'pyramid',{id:'middle',elevation:21,width:35,depth:21,rotation:37});
    const upper=level(shape,'tiered',{id:'upper',elevation:42,width:28,depth:21,rotation:37,windows:[{id:'keep-window',face:'front',u:0,v:.5,width:1,height:1,style:'classic'}]});
    const unrelated=level('square','dome',{id:'unrelated',buildingId:'other',x:20});
    s.render([base,middle,upper,unrelated]);
    Object.assign(s.context,{
      uniqueId:()=> 'added',window:{confirm:()=>true},
      setLevels:value=>{s.context.levels=typeof value==='function'?value(s.context.levels):value;},
      setSelectedLevel:value=>{s.context.selectedLevel=value;},
      setDeletedBuildingUndo(){},setSelectedFace(){},setDetailCategory(){}
    });
    add.runInContext(s.context);
    const added=s.context.levels.at(-1);
    assert.equal(added.elevation,63);assert.equal(added.shape,shape);assert.equal(added.rotation,37);assert.equal(added.buildingId,'owner');assert.equal(added.roof,'flat');
    assert.equal(added.windows.length,0);assert.equal(s.context.levels[2],upper);
    s.context.selectedLevel=1;remove.runInContext(s.context);
    const remaining=s.context.levels;
    assert.equal(remaining[0],base);assert.equal(remaining[2],unrelated);
    assert.equal(remaining[1].elevation,21);assert.equal(remaining[1].roof,'tiered');assert.equal(remaining[1].windows,upper.windows);
    assert.equal(remaining[3].elevation,42);assert.equal(remaining[3].roof,'flat');
    const rendered=s.render(remaining);
    rendered.forEach((g,index)=>{assert.ok(roofs(g).length);for(const roof of roofs(g))assert.equal(roof.userData.levelIndex,index);});
    s.dispose();
  }
});
