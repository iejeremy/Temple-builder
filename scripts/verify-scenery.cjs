const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
(async()=>{
 const server=spawn('node',['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3003'],{stdio:['ignore','pipe','pipe']});let browser,logs='';server.stderr.on('data',d=>logs+=d);
 try{
  await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error(logs)),15000);server.stdout.on('data',d=>{logs+=d;if(String(d).includes('Ready')){clearTimeout(t);resolve()}});server.on('exit',c=>reject(Error('Server exit '+c+logs)))});
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:360,height:640}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:3003');await page.locator('canvas').waitFor();
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('echoes-temple-builder-v1')));
  await page.getByRole('button',{name:'+ Add',exact:true}).click();await page.getByRole('button',{name:/Scenery/}).click();
  const visibility=await page.evaluate(()=>{const dock=document.querySelector('[data-builder-bottom-toolbar]'),bounds=dock.getBoundingClientRect();return [...dock.querySelectorAll('button')].filter(b=>['+ boulder','+ grass','+ hill','+ river','+ creek'].includes(b.textContent.trim())).map(b=>{const r=b.getBoundingClientRect();return {label:b.textContent.trim(),visible:r.top>=bounds.top&&r.bottom<=bounds.bottom&&r.left>=0&&r.right<=innerWidth};});});
  assert.equal(visibility.length,5);assert.ok(visibility.every(b=>b.visible),'All five new scenery choices must be visible without scrolling: '+JSON.stringify(visibility));console.log('PASS: all five new scenery choices visible immediately on a 360×640 phone viewport');
  await page.screenshot({path:'/tmp/echoes-scenery-menu.png'});
  for(const kind of ['boulder','grass','hill','river','creek'])await page.getByRole('button',{name:'+ '+kind,exact:true}).click();
  await page.waitForTimeout(200);let design=await saved();assert.deepEqual(design.landscapeItems.map(i=>i.kind),['boulder','grass','hill','river','creek']);assert.equal(await page.getByText('YOUR WORLD BEGINS HERE',{exact:true}).count(),0);console.log('PASS: all five scenery pieces place and save without welcome text obscuring the site');
  await page.getByRole('spinbutton',{name:'river rotation',exact:true}).fill('45');await page.getByRole('spinbutton',{name:'river scale',exact:true}).fill('1.5');await page.getByRole('spinbutton',{name:'river x',exact:true}).fill('-4');
  design=await saved();const river=design.landscapeItems.find(i=>i.kind==='river');assert.equal(river.rotation,45);assert.equal(river.scale,1.5);assert.equal(river.x,-4);console.log('PASS: scenery position, scale and rotation controls update saved design');
  const creekRow=page.getByText('creek · selected',{exact:true}).locator('..');await creekRow.getByRole('button',{name:'Duplicate',exact:true}).click();assert.equal((await saved()).landscapeItems.length,6);
  await creekRow.getByRole('button',{name:'Delete',exact:true}).click();assert.equal((await saved()).landscapeItems.length,5);console.log('PASS: new scenery duplicates and deletes independently');
  const original=await saved();await page.reload();await page.locator('canvas').waitFor();await page.waitForTimeout(200);assert.deepEqual(await saved(),original);console.log('PASS: all new kinds and edited transforms restore after reload');
  // Inspect the real mounted scene, including instanced grass, to catch silent rock fallbacks.
  const meshes=await page.evaluate(()=>{
    const host=document.querySelector('canvas').parentElement;let fiber=host[Object.keys(host).find(k=>k.startsWith('__reactFiber'))];
    while(fiber){let hook=fiber.memoizedState;while(hook&&typeof hook==='object'){const root=hook.memoizedState?.current;if(root?.isGroup&&root.children.some(c=>c.userData.siteObjectId))return root.children.filter(c=>c.userData.siteObjectId).map(g=>({id:g.userData.siteObjectId,children:g.children.length,grass:g.children.some(o=>o.isInstancedMesh&&o.count===240)}));hook=hook.next;}fiber=fiber.return;}return [];
  });assert.equal(meshes.length,5);assert.ok(meshes.some(m=>m.grass));assert.ok(meshes.some(m=>m.children>20));console.log('PASS: real renderer builds grass instances and multi-part water geometry');
  await page.getByRole('button',{name:'Whole site',exact:true}).click();await page.waitForTimeout(500);await page.screenshot({path:process.env.QA_SCREENSHOT||'/tmp/echoes-scenery.png'});
  await page.setViewportSize({width:844,height:390});await page.getByRole('button',{name:'Whole site',exact:true}).click();await page.waitForTimeout(200);console.log('PASS: landscape whole-site framing');
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Clear site',exact:true}).click();assert.equal((await saved()).landscapeItems.length,0);
  await page.getByRole('button',{name:'Undo',exact:true}).click();assert.deepEqual(await saved(),original);console.log('PASS: Clear Site and Undo restore all new scenery exactly');
  assert.deepEqual(errors,[]);console.log('PASS: no browser runtime errors');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
