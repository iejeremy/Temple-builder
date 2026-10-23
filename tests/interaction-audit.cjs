// Execute the production pointer handlers with real Three.js math and a fake canvas.
// This checks event sequences without claiming physical-device or WebGL coverage.
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const test=require('node:test');
const ts=require('typescript');
const THREE=require('three');
const source=readFileSync(process.env.AUDIT_SOURCE||'src/components/Temple3DPreview.tsx','utf8');
const helpers=source.slice(source.indexOf('function templeFitDistance'),source.indexOf('export default function'));
const handlers=source.slice(source.indexOf('    const canvas=renderer.domElement;'),source.indexOf('    window.addEventListener("resize",resize);'));
function setup(moveMode=false){
  const callbacks=[],listeners={};
  const canvas={style:{},clientHeight:800,getBoundingClientRect:()=>({left:0,top:0,width:400,height:800}),setPointerCapture(){},addEventListener:(name,fn)=>listeners[name]=fn};
  const camera=new THREE.PerspectiveCamera(42,.5,.1,600);camera.position.set(0,8,12);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const root=new THREE.Group();root.userData.levelIndex=0;
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(4,4,4),new THREE.MeshBasicMaterial());root.add(mesh);
  const context={THREE,renderer:{domElement:canvas},camera,render(){},clampZoom:r=>Math.max(2,Math.min(100,r))};
  const ref=value=>({current:value});
  for(const name of ['movingLevelRef','movingDoorRef','movingArchRef','movingDetailRef','movingStatueRef','movingSiteObjectRef','resizingPerimeterRef','pointerDownRef'])context[name]=ref(null);
  Object.assign(context,{
    levelGroupsRef:ref([root]),statueGroupsRef:ref([]),siteObjectGroupsRef:ref([]),perimeterGroupRef:ref(null),
    orbitRef:ref({theta:0,phi:.9,radius:19,lastX:0,lastY:0,dragging:false,pinch:0}),
    cameraPanRef:ref({x:0,y:0,z:0,manual:false}),cameraFitRef:ref({userFramed:false}),gestureRef:ref({midX:0,midY:0}),
    buildingDragOffsetRef:ref(new THREE.Vector2()),dragPlaneRef:ref(new THREE.Plane(new THREE.Vector3(0,1,0),0)),
    liveRef:ref({moveMode,levels:[{x:0,z:0,elevation:0,width:28,depth:28,height:28}],onMoveLevel:(...args)=>callbacks.push(['move',...args]),onSelectLevel:()=>callbacks.push(['select'])}),
    raycasterRef:ref({setFromCamera(){},intersectObjects:()=>[{object:mesh,point:new THREE.Vector3(),distance:1}],ray:{intersectPlane:(_plane,hit)=>hit.set(2,0,2)}})
  });
  vm.runInNewContext(ts.transpile(helpers+handlers,{target:ts.ScriptTarget.ES2020}),context);
  const event=(type,id,x,y,extra={})=>listeners[type]({pointerId:id,clientX:x,clientY:y,buttons:1,...extra});
  return {event,callbacks,context,mesh,root};
}
test('tap jitter selects without moving in Move mode',()=>{
  const s=setup(true);s.event('pointerdown',1,100,100);s.event('pointermove',1,103,102);s.event('pointerup',1,103,102);
  assert.deepEqual(s.callbacks,[['select']]);
});
test('drag returning to origin never becomes a tap and repeated snaps emit once',()=>{
  const s=setup(true);s.event('pointerdown',1,100,100);s.event('pointermove',1,120,100);s.event('pointermove',1,121,100);s.event('pointermove',1,100,100);s.event('pointerup',1,100,100);
  assert.deepEqual(s.callbacks.map(x=>x[0]),['move']);
});
test('canceled touch never selects and leaves no active drag',()=>{
  const s=setup(true);s.event('pointerdown',1,100,100);s.event('pointercancel',1,100,100);s.event('pointermove',1,150,150);s.event('pointerup',1,100,100);
  assert.deepEqual(s.callbacks,[]);assert.equal(s.context.movingLevelRef.current,null);
});
test('second finger immediately disarms object drag; lifting it cannot select or orbit',()=>{
  const s=setup(true);s.event('pointerdown',1,100,100);s.event('pointerdown',2,200,100);
  assert.equal(s.context.movingLevelRef.current,null);
  s.event('pointerup',2,200,100);s.event('pointermove',1,150,100);s.event('pointerup',1,150,100);
  assert.deepEqual(s.callbacks,[]);assert.equal(s.context.orbitRef.current.theta,0);
});
test('third finger suspends gestures and rebases pan/pinch on release or cancellation',()=>{
  for(const end of ['pointerup','pointercancel']){
    const s=setup();s.event('pointerdown',1,100,100);s.event('pointerdown',2,200,100);s.event('pointerdown',3,250,100);
    s.event('pointermove',1,120,100);s.event('pointermove',2,220,100);
    assert.equal(s.context.cameraPanRef.current.x,0);
    s.event(end,3,250,100);s.event('pointermove',1,120,100);
    assert.equal(s.context.cameraPanRef.current.x,0);assert.equal(s.context.orbitRef.current.radius,19);
  }
});
test('normal swipe orbits; middle-button drag pans',()=>{
  const s=setup();s.event('pointerdown',1,100,100);s.event('pointermove',1,120,100);assert.notEqual(s.context.orbitRef.current.theta,0);
  s.event('pointerup',1,120,100);const theta=s.context.orbitRef.current.theta;
  s.event('pointerdown',2,100,100,{buttons:4});s.event('pointermove',2,120,100,{buttons:4,button:-1});
  assert.equal(s.context.orbitRef.current.theta,theta);assert.notEqual(s.context.cameraPanRef.current.x,0);
});
test('coincident pinch points keep zoom finite',()=>{
  const s=setup();s.event('pointerdown',1,100,100);s.event('pointerdown',2,200,100);s.event('pointermove',2,100,100);
  assert.ok(Number.isFinite(s.context.orbitRef.current.radius));
});
test('fit encloses structural-pivot sphere within unobscured UI space in both orientations',()=>{
  const ctx={THREE};vm.createContext(ctx);vm.runInContext(ts.transpile(helpers,{target:ts.ScriptTarget.ES2020})+';this.fit=templeFitDistance;this.orbit=orbitCameraPosition;',ctx);
  for(const [w,h] of [[390,844],[844,390]]){
    const bottom=Math.min(190,h*.32),top=Math.min(85,h*.14),vh=h+top+bottom;
    const camera=new THREE.PerspectiveCamera(42,w/vh,.1,600);camera.setViewOffset(w,vh,0,bottom,w,h);camera.userData.builderVerticalReserve=top+bottom;
    const center=new THREE.Vector3(4,3,-2),radius=7;
    for(const phi of [.82,.9,Math.PI/2-.08])for(const theta of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
      camera.position.copy(ctx.orbit(center,theta,phi,ctx.fit(radius,camera)));camera.lookAt(center);camera.updateMatrixWorld();
      const pivot=center.clone().project(camera);assert.ok(Math.abs(pivot.x)<1e-10);assert.ok(pivot.y>0);
      for(let i=0;i<400;i++){
        const y=1-2*(i+.5)/400,a=i*2.399963229728653,r=Math.sqrt(1-y*y);
        const p=center.clone().addScaledVector(new THREE.Vector3(r*Math.cos(a),y,r*Math.sin(a)),radius).project(camera);
        assert.ok(Math.abs(p.x)<=1&&p.y<=1-2*top/h&&p.y>=-1+2*bottom/h);
      }
    }
  }
});

test('tagged doors, windows, columns, stairs, arches, trim and pediments select their existing editor',()=>{
  for(const category of ['doors','windows','columns','stairs','arches','trim','pediments']){
    const s=setup(true);s.mesh.userData={levelIndex:0,detailCategory:category,detailId:'test',detailFace:'front'};
    if(category==='doors')Object.assign(s.mesh.userData,{doorId:'test',doorFace:'front'});
    if(category==='arches')Object.assign(s.mesh.userData,{archId:'test',archFace:'front'});
    s.context.liveRef.current.onSelectDetail=(_i,_face,value)=>s.callbacks.push(['detail',value]);
    s.event('pointerdown',1,100,100);s.event('pointermove',1,102,100);s.event('pointerup',1,102,100);
    assert.deepEqual(s.callbacks,[['detail',category]]);
  }
});
test('normal mode swipe cannot move a building',()=>{
  const s=setup();s.event('pointerdown',1,100,100);s.event('pointermove',1,140,100);s.event('pointerup',1,140,100);
  assert.deepEqual(s.callbacks,[]);
});
