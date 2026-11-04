// Run after npm run build. Real KTX2 decoding, lazy loading, fallback and
// diagnostic counters in production WebGL; no private camera mutations.
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const output=process.env.QA_OUTPUT||'/tmp/echoes-stone-qa';fs.mkdirSync(output,{recursive:true});
function inspect(){
 const canvas=document.querySelector('canvas');let fiber=canvas.parentElement[Object.keys(canvas.parentElement).find(k=>k.startsWith('__reactFiber'))];
 while(fiber){
  const refs=[];let hook=fiber.memoizedState;
  while(hook&&typeof hook==='object'){if(hook.memoizedState&&typeof hook.memoizedState==='object'&&'current'in hook.memoizedState)refs.push(hook.memoizedState.current);hook=hook.next;}
  const group=refs.find(r=>r?.isGroup),renderer=refs.find(r=>r?.domElement===canvas&&r?.info);
  if(group&&renderer){
   const materials=new Set();group.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.userData.surfaceKind==='stone')materials.add(m);});
   return {materials:[...materials].map(m=>({scanned:!!m.userData.scannedStone,color:m.map?.uuid,normal:m.normalMap?.uuid,roughness:m.roughnessMap?.uuid,
    normalSpace:m.normalMap?.colorSpace,colorSpace:m.map?.colorSpace,format:m.map?.format,mips:m.map?.mipmaps.length,dimensions:[m.map?.image?.width,m.map?.image?.height]})),
    calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,frame:renderer.info.render.frame};
  }fiber=fiber.return;
 }return null;
}
(async()=>{
 const base=process.env.QA_BASE_URL||'http://127.0.0.1:3008/';
 let browser,logs='';const server=process.env.QA_BASE_URL?null:spawn('node',['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3008'],{stdio:['ignore','pipe','pipe']});server?.stderr.on('data',d=>logs+=d);
 try{
  if(server)await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error(logs)),20000);server.stdout.on('data',d=>{logs+=d;if(String(d).includes('Ready')){clearTimeout(t);resolve();}});server.on('exit',c=>reject(Error('Server exit '+c+logs)));});
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,reducedMotion:'reduce'}),errors=[],requests=[];
  page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{if(/\/basis\/|\.ktx2/.test(r.url()))requests.push(r.url());});
  await page.goto(base);await page.locator('canvas').waitFor();
  await page.getByRole('button',{name:/Explore six designs/}).click();await page.getByRole('button',{name:/Marble Pantheon/}).click();await page.getByRole('button',{name:'Done',exact:true}).first().click();
  await page.waitForTimeout(500);assert.equal(requests.length,0);assert.equal(await page.locator('[data-preview-diagnostics]').count(),0);
  const draft=await page.evaluate(()=>JSON.parse(localStorage.getItem('echoes-temple-builder-v1')));draft.levels.forEach(l=>l.material='stone');
  await page.evaluate(draft=>localStorage.setItem('echoes-temple-builder-v1',JSON.stringify(draft)),draft);
  await page.goto(base+'?diagnostics=1');await page.locator('canvas').waitFor();
  await page.waitForFunction(inspectSource=>{const s=(0,eval)('('+inspectSource+')')();return s?.materials.length&&s.materials.every(m=>m.scanned);},inspect.toString(),{timeout:90000});
  const loaded=await page.evaluate(inspect);assert.ok(loaded.materials.every(m=>m.mips===10&&m.dimensions[0]===512&&m.colorSpace==='srgb'&&m.normalSpace===''));
  for(const key of ['color','normal','roughness'])assert.equal(new Set(loaded.materials.map(m=>m[key])).size,1);
  assert.equal(requests.filter(u=>u.endsWith('.ktx2')).length,3);assert.equal(await page.locator('[data-preview-diagnostics]').count(),1);
  assert.ok((await page.locator('[data-preview-diagnostics]').textContent()).includes('Last rendered frame'));
  assert.equal(await page.locator('[data-preview-diagnostics]').evaluate(el=>getComputedStyle(el).pointerEvents),'none');
  await page.getByRole('button',{name:'Center Temple',exact:true}).click();await page.waitForTimeout(500);
  await page.screenshot({path:output+'/stone-portrait.png',timeout:90000});
  await page.setViewportSize({width:844,height:390});await page.getByRole('button',{name:'Center Temple',exact:true}).click();await page.waitForTimeout(400);
  await page.screenshot({path:output+'/stone-landscape.png',timeout:90000});
  await page.waitForTimeout(500);const settled=await page.evaluate(inspect);await page.waitForTimeout(1200);assert.equal((await page.evaluate(inspect)).frame,settled.frame,'Diagnostics must not keep rendering an idle scene');
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('echoes-temple-builder-v1'))),draft);assert.deepEqual(errors,[]);
  console.log('PASS: actual KTX2 decoding, shared mipmapped maps, lazy assets, both orientations, read-only diagnostics, idle rendering and saved design');
  // Simulate a failed asset response in a separate fresh preview.
  const fallback=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});fallback.setDefaultTimeout(90000);
  const failures=[];fallback.on('pageerror',e=>failures.push(e.message));await fallback.addInitScript(draft=>localStorage.setItem('echoes-temple-builder-v1',JSON.stringify(draft)),draft);
  await fallback.route('**/materials/stone-wall-02/*.ktx2',route=>route.fulfill({status:503,body:'Offline test'}));
  await fallback.goto(base);await fallback.locator('canvas').waitFor();await fallback.waitForTimeout(1000);
  const state=await fallback.evaluate(inspect);assert.ok(state.materials.length);assert.ok(state.materials.every(m=>!m.scanned&&m.color&&m.dimensions[0]===256));assert.ok(state.triangles>0);assert.deepEqual(failures,[]);
  await fallback.getByRole('button',{name:'Center Temple',exact:true}).click();await fallback.screenshot({path:output+'/stone-offline-fallback.png',timeout:90000});
  console.log('PASS: failed scanned assets retain the complete usable procedural finish');
  fs.writeFileSync(output+'/result.json',JSON.stringify({loaded,settled,fallback:state,requests,errors},null,2));
 }finally{if(browser)await browser.close();server?.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
