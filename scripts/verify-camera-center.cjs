const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const inspect=()=>{
 const host=document.querySelector('canvas').parentElement;let f=host[Object.keys(host).find(k=>k.startsWith('__reactFiber'))];
 while(f){const refs=[];let h=f.memoizedState;while(h&&typeof h==='object'){if(h.memoizedState&&typeof h.memoizedState==='object'&&'current'in h.memoizedState)refs.push(h.memoizedState.current);h=h.next;}
 const rig=refs.find(r=>r?.orbit&&r?.fit&&r?.viewport),camera=refs.find(r=>r?.isPerspectiveCamera),group=refs.find(r=>r?.isGroup);
 if(rig&&camera&&group){
  const center=rig.selectedBounds.getCenter(camera.position.clone()),projected=center.clone().project(camera),rect=host.getBoundingClientRect();
  const canvas=host.querySelector('canvas'),canvasRect=canvas.getBoundingClientRect();
  const level=group.children.find(g=>g.userData.levelIndex===0),front=level.position.clone();front.y=1.5;front.z+=2;front.project(camera);
  return {canvasSize:[canvasRect.width,canvasRect.height],hostSize:[rect.width,rect.height],buffer:[canvas.width,canvas.height],dpr:window.devicePixelRatio,focus:[rig.focus.x,rig.targetY,rig.focus.z],center:center.toArray(),pan:{...rig.pan},orbit:{theta:rig.orbit.theta,phi:rig.orbit.phi,radius:rig.orbit.radius},viewport:rig.viewport,
   centerPixel:[canvasRect.left+(projected.x+1)*canvasRect.width/2,canvasRect.top+(1-projected.y)*canvasRect.height/2],frontPixel:[canvasRect.left+(front.x+1)*canvasRect.width/2,canvasRect.top+(1-front.y)*canvasRect.height/2],
   toolbarTop:document.querySelector('[data-builder-bottom-toolbar]').getBoundingClientRect().top,headerBottom:document.querySelector('[data-builder-top-toolbar]').getBoundingClientRect().bottom,
   geometry:level.children.filter(m=>m.geometry).map(m=>m.geometry.uuid)};
 }f=f.return;}throw Error('Camera unavailable');
};
(async()=>{const server=spawn('node',['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3007'],{stdio:['ignore','pipe','pipe']});let browser,logs='';server.stderr.on('data',d=>logs+=d);
try{await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(logs)),20000);server.stdout.on('data',d=>{logs+=d;if(String(d).includes('Ready')){clearTimeout(timer);resolve()}});server.on('exit',c=>reject(Error('Server exited '+c+logs)))});
browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:360,height:669},deviceScaleFactor:2,hasTouch:true}),errors=[];page.setDefaultTimeout(60000);page.setDefaultNavigationTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('echoes-temple-builder-v1'))),pause=()=>page.waitForTimeout(650),delta=s=>Math.hypot(...s.focus.map((v,i)=>v-s.center[i]));
await page.goto('http://127.0.0.1:3007');await page.locator('canvas').waitFor();await page.getByRole('button',{name:'Start from a foundation',exact:true}).click();await page.getByRole('button',{name:'Rectangle',exact:true}).click();await pause();
let state=await page.evaluate(inspect);assert.deepEqual(state.canvasSize,state.hostSize,'Displayed canvas must match host at phone DPR');assert.deepEqual(state.buffer,[540,1003]);const before={...state};
await page.mouse.move(...state.frontPixel);await page.mouse.down();await page.mouse.move(state.frontPixel[0]+70,state.frontPixel[1],{steps:5});await page.waitForTimeout(150);assert.deepEqual((await page.evaluate(inspect)).focus,before.focus,'Pivot must stay fixed while a drag ray is active');await page.mouse.up();await pause();
state=await page.evaluate(inspect);assert.deepEqual(state.geometry,before.geometry);await page.getByRole('button',{name:'Confirm placement',exact:true}).click();await pause();state=await page.evaluate(inspect);
assert.ok((await saved()).levels[0].x!==0||(await saved()).levels[0].z!==0);
const baseline=process.env.CAMERA_EXPECT_STALE==='1';if(baseline){assert.ok(delta(state)>.3);console.log('REPRODUCED: moved foundation leaves stale orbit center',state.focus,state.center);}else{assert.ok(delta(state)<1e-5);assert.equal(state.orbit.radius,before.orbit.radius);assert.equal(state.orbit.theta,before.orbit.theta);console.log('PASS: placement follows moved foundation without resetting zoom/orbit or rebuilding its geometry');}
await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByRole('button',{name:'levels',exact:true}).click();const one=await page.evaluate(inspect);await page.getByRole('button',{name:'+ Add Level',exact:true}).click();await page.getByRole('button',{name:'Circle',exact:true}).click();await pause();state=await page.evaluate(inspect);
assert.equal((await saved()).levels.length,2);if(baseline){assert.ok(Math.abs(state.focus[1]-state.center[1])>1);console.log('REPRODUCED: adding upper level leaves vertical pivot on old single-story center',state.focus,state.center);return;}
assert.ok(delta(state)<1e-5);assert.equal(state.orbit.radius,one.orbit.radius);console.log('PASS: two-level rectangle/circle stack has its orbit pivot at the complete building midpoint without auto zoom');
const cdp=await page.context().newCDPSession(page),touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y,id])=>({x,y,id,radiusX:2,radiusY:2}))});
const pinchBase=await page.evaluate(inspect),pinchDesign=await saved();
for(let cycle=0;cycle<6;cycle++){
 await touch('touchStart',[[100,220,1],[220,220,2]]);await touch('touchMove',[[50,180,1],[270,260,2]]);await touch('touchMove',[[100,220,1],[220,220,2]]);await touch('touchEnd',[]);
}
await pause();const pinchFinal=await page.evaluate(inspect);for(const axis of ['x','y','z'])assert.ok(Math.abs(pinchFinal.pan[axis]-pinchBase.pan[axis])<1e-6);assert.ok(Math.abs(pinchFinal.orbit.radius-pinchBase.orbit.radius)<1e-6);assert.deepEqual(await saved(),pinchDesign);console.log('PASS: six closed touch-pinch cycles cannot shift the camera target or saved objects');
await touch('touchStart',[[100,220,1],[220,220,2]]);await touch('touchMove',[[140,240,1],[260,240,2]]);await touch('touchEnd',[]);await pause();assert.equal((await page.evaluate(inspect)).pan.manual,true);
const centerButton=await page.getByRole('button',{name:'Center Temple',exact:true}).boundingBox();await touch('touchStart',[[centerButton.x+centerButton.width/2,centerButton.y+centerButton.height/2,1]]);await touch('touchEnd',[]);await pause();state=await page.evaluate(inspect);assert.ok(delta(state)<1e-5);assert.equal(state.pan.x,0);assert.equal(state.pan.y,0);assert.equal(state.pan.z,0);
assert.ok(Math.abs(state.centerPixel[0]-180)<.5);assert.ok(Math.abs(state.centerPixel[1]-(state.headerBottom+state.toolbarTop)/2)<1.5);console.log('PASS: Center resets two-finger pan and centers between the actual header and dock');
const centered=state;let design=await saved();
for(let i=0;i<4;i++){await touch('touchStart',[[140,240,1]]);await touch('touchMove',[[230,260,1]]);await touch('touchEnd',[]);await pause();state=await page.evaluate(inspect);assert.ok(Math.abs(state.centerPixel[0]-centered.centerPixel[0])<.5&&Math.abs(state.centerPixel[1]-centered.centerPixel[1])<.5);assert.ok(delta(state)<1e-5);}
assert.deepEqual(await saved(),design);console.log('PASS: repeated touch orbits keep the two-level midpoint fixed on screen and do not move the design');
const orbited=state;await page.getByRole('button',{name:'Level 1',exact:true}).click();await pause();state=await page.evaluate(inspect);assert.deepEqual(state.orbit,orbited.orbit);
const selected=state;await page.getByRole('button',{name:'Level 2',exact:true}).click();await pause();state=await page.evaluate(inspect);assert.deepEqual(state.orbit,selected.orbit);assert.deepEqual(state.focus,selected.focus);assert.deepEqual(state.pan,selected.pan);console.log('PASS: selecting levels does not reframe');
await page.getByRole('button',{name:'Done',exact:true}).first().click();await page.getByRole('button',{name:'Center Temple',exact:true}).click();await pause();await page.screenshot({timeout:90000,path:'/tmp/echoes-camera-fixed-portrait.png'});
await page.getByRole('button',{name:'Front',exact:true}).click();await pause();await page.getByRole('button',{name:'Move',exact:true}).click();const priorMove=await page.evaluate(inspect),priorDesign=await saved();
await page.mouse.move(...priorMove.frontPixel);await page.mouse.down();await page.mouse.move(priorMove.frontPixel[0]+45,priorMove.frontPixel[1],{steps:5});await page.waitForTimeout(150);assert.deepEqual((await page.evaluate(inspect)).focus,priorMove.focus);await page.mouse.up();await pause();state=await page.evaluate(inspect);design=await saved();
assert.ok(design.levels[0].x!==priorDesign.levels[0].x||design.levels[0].z!==priorDesign.levels[0].z);const dx=design.levels[0].x-priorDesign.levels[0].x,dz=design.levels[0].z-priorDesign.levels[0].z;assert.equal(design.levels[1].x-priorDesign.levels[1].x,dx);assert.equal(design.levels[1].z-priorDesign.levels[1].z,dz);assert.ok(delta(state)<1e-5);assert.deepEqual(state.orbit,priorMove.orbit);assert.deepEqual(state.geometry,priorMove.geometry);await page.getByRole('button',{name:'Moving',exact:true}).click();console.log('PASS: moving a confirmed two-level building keeps its stack and geometry, then follows the completed move');
await page.setViewportSize({width:844,height:390});await pause();await page.getByRole('button',{name:'Center Temple',exact:true}).click();await pause();state=await page.evaluate(inspect);assert.ok(delta(state)<1e-5);assert.ok(Math.abs(state.centerPixel[0]-422)<.5);assert.ok(Math.abs(state.centerPixel[1]-(state.headerBottom+state.toolbarTop)/2)<1.5);await page.screenshot({timeout:90000,path:'/tmp/echoes-camera-fixed-landscape.png'});assert.deepEqual(await saved(),design);assert.deepEqual(errors,[]);console.log('PASS: portrait/landscape and saved two-level design preserved without JavaScript/WebGL errors');
for(const dpr of [1,1.25,2,3]){
 const context=await browser.newContext({viewport:{width:360,height:669},deviceScaleFactor:dpr,hasTouch:true}),p=await context.newPage();p.setDefaultTimeout(60000);p.setDefaultNavigationTimeout(90000);p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await p.addInitScript(data=>localStorage.setItem('echoes-temple-builder-v1',JSON.stringify(data)),design);await p.goto('http://127.0.0.1:3007');await p.locator('canvas').waitFor();
 for(const size of [{width:360,height:669},{width:844,height:390}]){
  await p.setViewportSize(size);await p.getByRole('button',{name:'Center Temple',exact:true}).click();await p.waitForTimeout(650);
  for(const detail of [true,false]){
   await p.getByRole('button',{name:detail?/Balanced/:/Fine detail/}).click();await p.waitForTimeout(100);const v=await p.evaluate(inspect),ratio=Math.min(dpr,detail?2:1.5);
   assert.deepEqual(v.canvasSize,[size.width,size.height]);assert.deepEqual(v.hostSize,v.canvasSize);assert.deepEqual(v.buffer,[Math.floor(size.width*ratio),Math.floor(size.height*ratio)]);
   assert.ok(Math.abs(v.centerPixel[0]-size.width/2)<.5);assert.ok(Math.abs(v.centerPixel[1]-(v.headerBottom+v.toolbarTop)/2)<1.5);
  }
 }
 assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('echoes-temple-builder-v1'))),design);await context.close();console.log('PASS: actual canvas sizing and displayed midpoint at DPR '+dpr+', both qualities and orientations');
}
assert.deepEqual(errors,[]);
}finally{if(browser)await browser.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1});
