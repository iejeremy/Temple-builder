// Run after npm run build. Playwright and Chromium paths are environment-configurable.
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const artifactDir=process.env.QA_OUTPUT||'/tmp/echoes-studio-qa';fs.mkdirSync(artifactDir,{recursive:true});
const inspect=()=>{
 const host=document.querySelector('canvas')?.parentElement;
 let fiber=host?.[Object.keys(host).find(k=>k.startsWith('__reactFiber'))];
 while(fiber){
  const refs=[];let hook=fiber.memoizedState;
  while(hook&&typeof hook==='object'){if(hook.memoizedState&&typeof hook.memoizedState==='object'&&'current'in hook.memoizedState)refs.push(hook.memoizedState.current);hook=hook.next;}
  const rig=refs.find(r=>r?.orbit&&r?.fit&&r?.viewport),camera=refs.find(r=>r?.isPerspectiveCamera),group=refs.find(r=>r?.isGroup);
  if(rig&&camera&&group){
   const level=group.children.find(g=>g.userData.levelIndex===0);
   let point=null,geometry=[];
   if(level){const v=level.position.clone();v.y=1.5;v.z+=2;v.project(camera);const rect=host.getBoundingClientRect();point={x:rect.left+(v.x+1)*rect.width/2,y:rect.top+(1-v.y)*rect.height/2};level.traverse(o=>{if(o.geometry)geometry.push(o.geometry.uuid)});}
   const categories={};group.traverse(o=>{if(o.userData.detailCategory)categories[o.userData.detailCategory]=(categories[o.userData.detailCategory]||0)+1;});
   return {orbit:{...rig.orbit},pan:{...rig.pan},focus:{...rig.focus},targetY:rig.targetY,point,geometry,categories,viewport:rig.viewport,groupChildren:group.children.length,canvas:[host.clientWidth,host.clientHeight]};
  }
  fiber=fiber.return;
 }
 throw Error('Could not inspect mounted preview');
};
(async()=>{
 const server=spawn('node',['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3002'],{stdio:['ignore','pipe','pipe']});let logs='',browser;
 server.stderr.on('data',d=>logs+=d);
 try{
 await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error(logs)),15000);server.stdout.on('data',d=>{logs+=d;if(String(d).includes('Ready')){clearTimeout(t);resolve()}});server.on('exit',c=>reject(Error('Server exit '+c+logs)))});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:3002');await page.locator('canvas').waitFor();await page.waitForTimeout(600);
 await page.getByRole('button',{name:'Start from a foundation'}).click();
 await page.getByRole('button',{name:'5-Point Star',exact:true}).click();
 await page.getByRole('button',{name:'Confirm placement',exact:true}).click();await page.waitForTimeout(300);
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('echoes-temple-builder-v1')));
 assert.equal((await saved()).levels[0].shape,'star');
 console.log('PASS: choose foundation → ghost → confirm → local save');
 let state=await page.evaluate(inspect);await page.mouse.move(state.point.x,state.point.y);await page.mouse.down();await page.mouse.move(state.point.x+35,state.point.y,{steps:4});await page.mouse.up();
 assert.equal((await saved()).levels[0].x,0);console.log('PASS: orbit does not move temple');
 await page.getByRole('button',{name:'Front',exact:true}).click();await page.waitForTimeout(100);
 await page.getByRole('button',{name:'Move',exact:true}).click();state=await page.evaluate(inspect);const previousGeometry=state.geometry;
 await page.mouse.move(state.point.x,state.point.y);await page.mouse.down();await page.mouse.move(state.point.x+40,state.point.y,{steps:5});await page.mouse.up();await page.waitForTimeout(150);
 let moved=await saved();assert.ok(moved.levels[0].x!==0||moved.levels[0].z!==0);
 assert.deepEqual((await page.evaluate(inspect)).geometry,previousGeometry);console.log('PASS: deliberate drag moves temple without rebuilding its meshes');
 await page.getByRole('button',{name:'Moving',exact:true}).click();await page.getByRole('button',{name:'Center Temple',exact:true}).click();
 const cdp=await page.context().newCDPSession(page);const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y,id])=>({x,y,id,radiusX:2,radiusY:2}))});
 await touch('touchStart',[[120,400,1],[220,400,2]]);await touch('touchMove',[[100,400,1],[240,400,2]]);await touch('touchEnd',[]);await page.waitForTimeout(100);
 assert.ok(Number.isFinite((await page.evaluate(inspect)).orbit.radius));assert.deepEqual((await saved()).levels,moved.levels);console.log('PASS: emulated two-finger pinch leaves building positions unchanged');

 await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByRole('button',{name:'levels',exact:true}).click();
 await page.getByRole('button',{name:'+ Add Level',exact:true}).click();await page.waitForTimeout(250);
 let design=await saved();assert.equal(design.levels.length,2);assert.equal(design.levels[0].buildingId,design.levels[1].buildingId);assert.equal(design.levels[1].elevation,design.levels[0].height);
 console.log('PASS: added level stays owned and vertically stacked');
 await page.getByRole('button',{name:'Done',exact:true}).first().click();
 state=await page.evaluate(inspect);const before=JSON.stringify({orbit:state.orbit,pan:state.pan,focus:state.focus});
 await page.getByRole('button',{name:'Edit',exact:true}).click();await page.waitForTimeout(250);const after=await page.evaluate(inspect);
 assert.equal(JSON.stringify({orbit:after.orbit,pan:after.pan,focus:after.focus}),before);console.log('PASS: edit selection does not reframe the camera');
 await page.getByRole('button',{name:'Center Temple',exact:true}).click();
 await page.screenshot({path:path.join(artifactDir,'star-portrait.png')});
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(300);
 for(const name of ['Whole site','Front','Plan','Center Temple'])await page.getByRole('button',{name,exact:true}).click();
 await page.screenshot({path:path.join(artifactDir,'star-landscape.png')});console.log('PASS: landscape resize and all view presets');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Save copy',exact:false}).click();assert.equal((await download).suggestedFilename(),'Echoes-Temple-Design.json');
 const capture=page.waitForEvent('download');await page.getByRole('button',{name:'Capture',exact:true}).click();assert.equal((await capture).suggestedFilename(),'Echoes-Temple.png');console.log('PASS: portable design copy and PNG capture');
 await page.reload();await page.locator('canvas').waitFor();await page.waitForTimeout(300);assert.equal((await saved()).levels.length,2);console.log('PASS: saved two-level temple restores');
 // Test complete templates on an empty site, retaining each screenshot as evidence.
 for(let i=0;i<6;i++){
  await page.evaluate(()=>localStorage.removeItem('echoes-temple-builder-v1'));await page.reload();await page.waitForTimeout(150);
  await page.getByRole('button',{name:'Explore six designs',exact:false}).click();
  const names=['Temple of the Sun','Eternal Courtyard','Celestial Shrine','Marble Pantheon','Cathedral of Echoes','Temple of Unity'];
  await page.getByRole('button',{name:new RegExp(names[i])}).click();await page.waitForTimeout(350);
  assert.ok((await saved()).levels.length>0);assert.equal(await page.getByText('The 3D view needs to reconnect.').count(),0);
  await page.getByRole('button',{name:'Whole site',exact:true}).click();await page.waitForTimeout(400);
  await page.screenshot({path:path.join(artifactDir,`template-${i+1}.png`)});
  console.log('PASS: template renders and saves — '+names[i]);
 }

 // Load a controlled complete design to inspect real attachment meshes and ray-picked editors.
 await page.evaluate(()=>{
  const raw=JSON.parse(localStorage.getItem('echoes-temple-builder-v1'));const base=raw.levels[0];
  const level={...base,id:'qa-main',buildingId:'qa-main',architecture:'echoes',shape:'rectangle',width:42,depth:28,height:22,elevation:0,x:0,z:0,rotation:0,roof:'flat',patio:true,
   windows:[{id:'qa-window',face:'front',style:'classic',u:-.6,v:.55,width:1,height:1.2}],doors:[{id:'qa-door',face:'front',style:'single',u:.6,width:1.1,height:2}],
   columns:[{id:'qa-column',face:'left',style:'corinthian',u:0}],arches:[{id:'qa-arch',face:'back',style:'round',u:0}],stairs:[{id:'qa-stairs',face:'front',style:'wide',u:0}],
   trims:[{id:'qa-trim',face:'right',style:'dentils',u:0}],pediments:[{id:'qa-pediment',face:'back',style:'triangular',u:0}]};
  raw.levels=[level];raw.siteColumns=[{id:'qa-site-column',style:'ionic',material:'marble',x:5,z:3,height:3,radius:.2,rotation:0}];
  raw.statues=[{id:'qa-statue',kind:'guardian',finish:'bronze',x:-5,z:3,rotation:0,scale:1}];raw.landscapeItems=[{id:'qa-fountain',kind:'fountain',x:0,z:7,rotation:0,scale:1}];
  raw.perimeter={style:'rectangle',material:'stone',margin:2,height:1,thickness:.2,towerShape:'round',towers:true,gate:true,arches:true,columns:true};raw.scenery='twilight';localStorage.setItem('echoes-temple-builder-v1',JSON.stringify(raw));
 });
 await page.setViewportSize({width:390,height:844});await page.reload();await page.locator('canvas').waitFor();await page.waitForTimeout(300);
 state=await page.evaluate(inspect);
 for(const category of ['windows','doors','columns','arches','stairs','trim','pediments','roof'])assert.ok(state.categories[category]>0,category+' missing');
 assert.ok(state.categories.windows>=5);assert.ok(state.categories.columns>=8);console.log('PASS: complete scene retains roofs, stairs, walls, columns, doors, windows and tagged decorative sub-pieces');
 await page.getByRole('button',{name:'Whole site',exact:true}).click();await page.waitForTimeout(400);await page.screenshot({path:path.join(artifactDir,'complete-twilight-portrait.png')});
 await page.setViewportSize({width:1280,height:800});await page.waitForTimeout(400);await page.getByRole('button',{name:'Whole site',exact:true}).click();await page.screenshot({path:path.join(artifactDir,'complete-twilight-desktop.png')});
 assert.deepEqual(errors,[]);console.log('PASS: no browser JavaScript or WebGL console errors');
 fs.writeFileSync(path.join(artifactDir,'result.json'),JSON.stringify({errors,verifiedAt:new Date().toISOString(),screenshots:fs.readdirSync(artifactDir).filter(f=>f.endsWith('.png'))},null,2));
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
