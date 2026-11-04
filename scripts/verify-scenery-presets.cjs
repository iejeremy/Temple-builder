// Real browser evidence for the six scenery choices and preservation boundaries.
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const output=process.env.QA_OUTPUT||'/tmp/echoes-scenery-presets';fs.mkdirSync(output,{recursive:true});
const inspect=()=>{
 const canvas=document.querySelector('canvas'),host=canvas.parentElement;let fiber=host[Object.keys(host).find(k=>k.startsWith('__reactFiber'))];
 while(fiber){const refs=[];let h=fiber.memoizedState;while(h){if(h.memoizedState&&typeof h.memoizedState==='object'&&'current'in h.memoizedState)refs.push(h.memoizedState.current);h=h.next;}
 const scene=refs.find(r=>r?.isScene),rig=refs.find(r=>r?.orbit&&r?.viewport),group=refs.find(r=>r?.isGroup),renderer=refs.find(r=>r?.domElement===canvas&&r?.info);
 if(scene&&rig&&group&&renderer){
  const env=scene.getObjectByName('environment-landscape'),trees=env.getObjectByName('environment-trees'),pieces=[];
  group.traverse(o=>{if(o.isMesh)pieces.push({position:o.position.toArray(),rotation:o.rotation.toArray(),scale:o.scale.toArray(),vertices:Array.from(o.geometry.getAttribute('position').array),index:o.geometry.index?.count||0});});
  return {camera:{orbit:{...rig.orbit},pan:{...rig.pan},focus:{...rig.focus}},pieces,theme:env.userData.theme,trees:trees.children.length,styles:trees.children.map(t=>t.userData.treeStyle),sea:env.getObjectByName('environment-coast-water').visible,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,groundWidth:scene.getObjectByName('terrain-ground').geometry.parameters.width};
 }fiber=fiber.return;}throw Error('Preview not mounted');
};
(async()=>{let logs='',browser;const errors=[],results=[];
 const server=spawn('node',['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3017'],{stdio:['ignore','pipe','pipe']});server.stderr.on('data',d=>logs+=d);
 try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(logs)),20000);server.stdout.on('data',d=>{logs+=d;if(String(d).includes('Ready')){clearTimeout(timer);resolve();}});server.on('exit',c=>reject(Error('Server exit '+c+logs)));});
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',headless:true,args:['--no-sandbox','--no-zygote','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:900},hasTouch:true,reducedMotion:'reduce'});page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.location().url?.endsWith('/favicon.ico'))errors.push(m.text());});
  await page.goto('http://127.0.0.1:3017');await page.locator('canvas').waitFor();await page.getByRole('button',{name:/Explore six designs/}).click();await page.getByRole('button',{name:/Marble Pantheon/}).click();await page.getByRole('button',{name:'Done',exact:true}).first().click();
  await page.getByRole('button',{name:'+ Add',exact:true}).click();await page.getByRole('button',{name:/Scenery/}).click();await page.getByRole('button',{name:'+ tree',exact:true}).click();await page.getByRole('button',{name:'Done',exact:true}).first().click();
  await page.getByRole('button',{name:'View landscape',exact:true}).click();await page.waitForTimeout(600);
  const baseline=await page.evaluate(inspect),savedBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('echoes-temple-builder-v1')));
  for(const [id,label] of [['garden','Garden'],['desert','Desert'],['twilight','Twilight'],['autumn','Autumn Forest'],['alpine','Alpine Meadow'],['coast','Coast']]){
   await page.getByRole('button',{name:'+ Add',exact:true}).click();await page.getByRole('button',{name:/Scenery/}).click();
   await page.waitForTimeout(200);const choiceCamera=(await page.evaluate(inspect)).camera;
   const choice=page.getByRole('region',{name:'World scenery'}).getByRole('button',{name:new RegExp('^'+label)});await choice.click();assert.equal(await choice.getAttribute('aria-pressed'),'true');
   await page.getByRole('button',{name:'Done',exact:true}).first().click();await page.waitForTimeout(350);
   const state=await page.evaluate(inspect),saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('echoes-temple-builder-v1')));assert.equal(state.theme,id);assert.equal(saved.scenery,id);
   const {scenery:oldTheme,...before}=savedBefore,{scenery:newTheme,...after}=saved;assert.deepEqual(after,before,'Scenery must never alter a saved piece');assert.deepEqual(state.pieces,baseline.pieces,'Placed geometry must stay exact');assert.deepEqual(state.camera,choiceCamera,'Theme must not move camera');assert.equal(state.trees,54);assert.equal(state.groundWidth,2048);assert.equal(state.sea,id==='coast');
   await page.screenshot({path:path.join(output,id+'.png'),timeout:90000});
   await page.reload();await page.locator('canvas').waitFor();await page.waitForTimeout(250);assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('echoes-temple-builder-v1'))),saved);assert.equal((await page.evaluate(inspect)).theme,id);
   // Reload uses the existing first-load framing; explicitly return to the same
   // view before comparing the next choice, without changing production camera code.
   await page.getByRole('button',{name:'View landscape',exact:true}).click();await page.waitForTimeout(350);
   results.push({id,trees:state.trees,sea:state.sea,textures:state.textures,geometries:state.geometries});console.log('PASS: '+label+' — exact saved pieces/geometry/camera and reload');
  }
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'+ Add',exact:true}).click();await page.getByRole('button',{name:/Scenery/}).click();await page.screenshot({path:path.join(output,'picker-portrait.png'),timeout:90000});
  const coast=page.getByRole('region',{name:'World scenery'}).getByRole('button',{name:/^Coast/});await coast.scrollIntoViewIfNeeded();await coast.click();await page.getByRole('button',{name:'Done',exact:true}).first().click();await page.screenshot({path:path.join(output,'coast-portrait.png'),timeout:90000});
  const dl=page.waitForEvent('download');await page.getByRole('button',{name:/Save copy/}).click();const raw=JSON.parse(fs.readFileSync(await(await dl).path(),'utf8'));assert.equal(raw.scenery,'coast');
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({results,errors,physicalPhoneTested:false},null,2));console.log('PASS: mobile carousel, Coast export and no JavaScript/WebGL errors');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
