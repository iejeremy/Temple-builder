// Execute the production pointer handlers with real Three.js math and a fake canvas.
// This checks event sequences without claiming physical-device or WebGL coverage.
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const test=require('node:test');
const ts=require('typescript');
const THREE=require('three');
const source=readFileSync(process.env.AUDIT_SOURCE||'src/components/Temple3DPreview.tsx','utf8');
const helpers=source.slice(source.indexOf('/** Convert pointer coordinates'),source.indexOf('export default function'));
const controllerModule={exports:{}};
vm.runInNewContext(ts.transpile(readFileSync('src/components/TempleCameraController.ts','utf8'),{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}),{require,exports:controllerModule.exports,module:controllerModule});
const {TempleCameraController}=controllerModule.exports;
const handlers=source.slice(source.indexOf('    const canvas=renderer.domElement;'),source.indexOf('    window.addEventListener("resize",resize);'));
function setup(moveMode=false){
  const callbacks=[],listeners={};
  const canvas={style:{},clientHeight:800,getBoundingClientRect:()=>({left:0,top:0,width:400,height:800}),setPointerCapture(){},addEventListener:(name,fn)=>listeners[name]=fn};
  const camera=new THREE.PerspectiveCamera(42,.5,.1,600);camera.position.set(0,8,12);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const root=new THREE.Group();root.userData.levelIndex=0;
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(4,4,4),new THREE.MeshBasicMaterial());root.add(mesh);
  const context={THREE,requestAnimationFrame:()=>1,setRenderError(){},renderer:{domElement:canvas},camera,render(){},clampZoom:r=>Math.max(2,Math.min(100,r))};
  const ref=value=>({current:value});context.syncFocusedBuildingRef=ref(()=>{});context.cameraRigRef=ref(new TempleCameraController());context.cameraRigRef.current.orbit.radius=19;
  for(const name of ['movingLevelRef','movingDoorRef','movingArchRef','movingDetailRef','movingStatueRef','movingSiteObjectRef','resizingPerimeterRef','pointerDownRef'])context[name]=ref(null);
  Object.assign(context,{
    levelGroupsRef:ref([root]),statueGroupsRef:ref([]),siteObjectGroupsRef:ref([]),perimeterGroupRef:ref(null),
    orbitRef:ref({theta:0,phi:.9,radius:19,lastX:0,lastY:0,dragging:false,pinch:0}),
    cameraPanRef:ref({x:0,y:0,z:0,manual:false}),cameraFitRef:ref({userFramed:false}),gestureRef:ref({midX:0,midY:0}),
    buildingDragOffsetRef:ref(new THREE.Vector2()),siteDragOffsetRef:ref(new THREE.Vector2()),dragPlaneRef:ref(new THREE.Plane(new THREE.Vector3(0,1,0),0)),
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
  assert.deepEqual(s.callbacks,[]);assert.equal(s.context.cameraRigRef.current.orbit.theta,0);
});
test('third finger suspends gestures and rebases pan/pinch on release or cancellation',()=>{
  for(const end of ['pointerup','pointercancel']){
    const s=setup();s.event('pointerdown',1,100,100);s.event('pointerdown',2,200,100);s.event('pointerdown',3,250,100);
    s.event('pointermove',1,120,100);s.event('pointermove',2,220,100);
    assert.equal(s.context.cameraRigRef.current.pan.x,0);
    s.event(end,3,250,100);s.event('pointermove',1,120,100);
    assert.equal(s.context.cameraRigRef.current.pan.x,0);assert.equal(s.context.cameraRigRef.current.orbit.radius,19);
  }
});
test('normal swipe orbits; middle-button drag pans',()=>{
  const s=setup();s.event('pointerdown',1,100,100);s.event('pointermove',1,120,100);assert.notEqual(s.context.cameraRigRef.current.orbit.theta,0);
  s.event('pointerup',1,120,100);const theta=s.context.cameraRigRef.current.orbit.theta;
  s.event('pointerdown',2,100,100,{buttons:4});s.event('pointermove',2,120,100,{buttons:4,button:-1});
  assert.equal(s.context.cameraRigRef.current.orbit.theta,theta);assert.notEqual(s.context.cameraRigRef.current.pan.x,0);
});
test('coincident pinch points keep zoom finite',()=>{
  const s=setup();s.event('pointerdown',1,100,100);s.event('pointerdown',2,200,100);s.event('pointermove',2,100,100);
  assert.ok(Number.isFinite(s.context.cameraRigRef.current.orbit.radius));
});
test('closed pinch cycles cannot accumulate pan or zoom drift in either event order',()=>{
 for(const order of [[1,2],[2,1]]){
  const s=setup();s.context.cameraRigRef.current.pan={x:.4,y:.2,z:-.7,manual:true};
  s.event('pointerdown',1,100,200);s.event('pointerdown',2,220,200);
  for(let i=0;i<12;i++)for(const positions of [{1:[40,160],2:[280,240]},{1:[100,200],2:[220,200]}])for(const id of order)s.event('pointermove',id,...positions[id]);
  const rig=s.context.cameraRigRef.current;assert.deepEqual({...rig.pan},{x:.4,y:.2,z:-.7,manual:true});assert.equal(rig.orbit.radius,19);
  assert.deepEqual(s.callbacks,[]);
 }
});
test('two-finger translation pans without zoom drift and returns exactly to its start',()=>{
 const s=setup();s.event('pointerdown',1,100,200);s.event('pointerdown',2,220,200);
 s.event('pointermove',1,140,220);s.event('pointermove',2,260,220);
 const rig=s.context.cameraRigRef.current;assert.notEqual(rig.pan.x,0);assert.equal(rig.pan.manual,true);assert.equal(rig.orbit.radius,19);
 s.event('pointermove',2,220,200);s.event('pointermove',1,100,200);
 assert.deepEqual({...rig.pan},{x:0,y:0,z:0,manual:false});assert.equal(rig.orbit.radius,19);
});
test('Move-mode wall pinch still resizes the perimeter instead of zooming',()=>{
 const s=setup(true),wall=new THREE.Mesh(new THREE.BoxGeometry(4,1,.2),new THREE.MeshBasicMaterial()),perimeter=new THREE.Group();perimeter.add(wall);
 s.context.perimeterGroupRef.current=perimeter;s.context.liveRef.current.perimeter={margin:1};s.context.liveRef.current.onResizePerimeter=m=>s.callbacks.push(['resize',m]);
 s.context.raycasterRef.current.intersectObjects=()=>[{object:wall,distance:1}];
 s.event('pointerdown',1,100,200);s.event('pointerdown',2,220,200);s.event('pointermove',1,40,200);s.event('pointermove',2,280,200);
 assert.deepEqual(s.callbacks.at(-1),['resize',2]);assert.equal(s.context.cameraRigRef.current.orbit.radius,19);assert.deepEqual({...s.context.cameraRigRef.current.pan},{x:0,y:0,z:0,manual:false});
});
test('camera fits above measured UI in portrait and landscape',()=>{
  for(const [w,h,top,bottom] of [[390,844,85,260],[844,390,54,140],[1200,800,80,240]]){
    const rig=new TempleCameraController(),camera=new THREE.PerspectiveCamera(42,1,.1,600);
    rig.resize(camera,w,h,top,bottom);
    const center=new THREE.Vector3(4,3,-2),radius=7;
    rig.selectedBounds.setFromCenterAndSize(center,new THREE.Vector3(6,6,6));rig.selectedRadius=radius;
    for(const view of ['temple','front','plan']){
      rig.center(camera,view);const pivot=center.clone().project(camera);assert.ok(Math.abs(pivot.x)<1e-10);
      for(let i=0;i<400;i++){
        const y=1-2*(i+.5)/400,a=i*2.399963229728653,r=Math.sqrt(1-y*y);
        const p=center.clone().addScaledVector(new THREE.Vector3(r*Math.cos(a),y,r*Math.sin(a)),radius).project(camera);
        assert.ok(Math.abs(p.x)<=1&&p.y<=1-2*top/h&&p.y>=-1+2*bottom/h);
      }
    }
  }
});
test('vertical pan, extreme zoom and orbit cannot put the camera underground',()=>{
  const rig=new TempleCameraController(),camera=new THREE.PerspectiveCamera();
  rig.pan.y=-1000;rig.orbit.phi=10;rig.orbit.radius=0;rig.apply(camera);
  assert.ok(camera.position.y>.08);assert.ok(Number.isFinite(camera.position.x));
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
test('Scenery view adds landscape context only on explicit request and leaves temple bounds unchanged',()=>{
 const rig=new TempleCameraController(),camera=new THREE.PerspectiveCamera(42,.5,.1,600);
 rig.resize(camera,390,844,95,120);rig.siteBounds.set(new THREE.Vector3(-6,0,-6),new THREE.Vector3(6,5,6));rig.selectedBounds.copy(rig.siteBounds);rig.selectedRadius=9;
 const bounds=rig.siteBounds.clone();rig.center(camera,'site');const radius=rig.orbit.radius;
 rig.center(camera,'landscape');assert.ok(rig.orbit.radius>radius*1.5);assert.ok(rig.siteBounds.equals(bounds));
 rig.center(camera,'site');assert.equal(rig.orbit.radius,radius);
});

test('framed building follows completed moves and new levels without changing user navigation',()=>{
 const rig=new TempleCameraController(),camera=new THREE.PerspectiveCamera(42,1,.1,600);
 rig.resize(camera,390,724,90,115);
 rig.selectedBounds.set(new THREE.Vector3(-2,0,-2),new THREE.Vector3(2,3,2));rig.selectedRadius=4;
 rig.center(camera,'temple','owner-a');rig.orbit.theta=1.8;rig.orbit.phi=.9;rig.orbit.radius=12;
 rig.pan={x:.4,y:.2,z:-.8,manual:true};const orbit={...rig.orbit},pan={...rig.pan};
 const moved=new THREE.Box3(new THREE.Vector3(6,0,-7),new THREE.Vector3(10,6,-3));
 assert.equal(rig.followBuilding('owner-a',moved),true);
 assert.deepEqual({...rig.focus},{x:8,z:-5});assert.equal(rig.targetY,3);assert.deepEqual({...rig.orbit},orbit);assert.deepEqual({...rig.pan},pan);
 for(let i=0;i<12;i++){rig.orbit.theta+=.5;rig.apply(camera);const target=new THREE.Vector3(8.4,3.2,-5.8).project(camera);assert.ok(Math.abs(target.x)<1e-10);}
});

test('other buildings, empty bounds and site views never steal the orbit target',()=>{
 const rig=new TempleCameraController(),camera=new THREE.PerspectiveCamera();
 rig.selectedBounds.set(new THREE.Vector3(-2,0,-2),new THREE.Vector3(2,3,2));rig.selectedRadius=4;
 rig.center(camera,'temple','owner-a');const focus={...rig.focus},targetY=rig.targetY;
 const other=new THREE.Box3(new THREE.Vector3(20,0,20),new THREE.Vector3(24,8,24));
 assert.equal(rig.followBuilding('owner-b',other),false);assert.equal(rig.followBuilding('owner-a',new THREE.Box3()),false);
 assert.deepEqual({...rig.focus},focus);assert.equal(rig.targetY,targetY);
 rig.siteBounds.copy(other);rig.center(camera,'site','owner-a');assert.equal(rig.focusedBuildingId,null);assert.equal(rig.followBuilding('owner-a',other),false);
 rig.pan={x:20,y:2,z:-7,manual:true};rig.selectedBounds.copy(other);rig.center(camera,'temple','owner-b');assert.equal(rig.focusedBuildingId,'owner-b');assert.deepEqual({...rig.pan},{x:0,y:0,z:0,manual:false});
});

test('Center puts the complete stacked-building midpoint halfway between header and dock',()=>{
 for(const [w,h,top,bottom] of [[360,669,90,115],[390,724,90,115],[390,844,95,300],[844,390,95,110]]){
  const rig=new TempleCameraController(),camera=new THREE.PerspectiveCamera(42,1,.1,600);
  rig.resize(camera,w,h,top,bottom);rig.selectedBounds.set(new THREE.Vector3(6,0,-7),new THREE.Vector3(10,6,-3));rig.selectedRadius=5;
  rig.center(camera,'temple','owner');const midpoint=rig.selectedBounds.getCenter(new THREE.Vector3());
  for(let i=0;i<24;i++){
   rig.orbit.theta=i*Math.PI/12;rig.apply(camera);const ndc=midpoint.clone().project(camera);
   assert.ok(Math.abs((ndc.x+1)*w/2-w/2)<1e-6);assert.ok(Math.abs((1-ndc.y)*h/2-(h+top-bottom)/2)<1e-6);
  }
 }
});
