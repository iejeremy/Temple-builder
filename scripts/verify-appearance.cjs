// Production-browser evidence. QA_COMPARE points to a baseline result.json to enforce
// identical geometry, ownership, attachment tags and camera state across a visual pass.
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const output=process.env.QA_OUTPUT||'/tmp/echoes-appearance';fs.mkdirSync(output,{recursive:true});
const inspect=()=>{
 const canvas=document.querySelector('canvas'),host=canvas.parentElement;
 let fiber=host[Object.keys(host).find(k=>k.startsWith('__reactFiber'))];
 while(fiber){
  const refs=[];let hook=fiber.memoizedState;
  while(hook&&typeof hook==='object'){if(hook.memoizedState&&typeof hook.memoizedState==='object'&&'current'in hook.memoizedState)refs.push(hook.memoizedState.current);hook=hook.next;}
  const rig=refs.find(r=>r?.orbit&&r?.viewport),group=refs.find(r=>r?.isGroup),renderer=refs.find(r=>r?.domElement===canvas&&r?.info);
  if(rig&&group&&renderer){
   const pieces=[],categories={},materials=new Set();let vertices=0;
   group.traverse(o=>{
    if(o.userData.detailCategory)categories[o.userData.detailCategory]=(categories[o.userData.detailCategory]||0)+1;
    if(o.isMesh){const p=o.geometry.getAttribute('position');vertices+=p.count;
     let sums=[0,0,0];for(let i=0;i<p.count;i++){sums[0]+=p.getX(i);sums[1]+=p.getY(i);sums[2]+=p.getZ(i);}
     const tags={};for(const key of ['levelIndex','detailCategory','detailFace','doorFace','archFace'])if(o.userData[key]!==undefined)tags[key]=o.userData[key];
     for(const key of ['detailId','doorId','archId','siteObjectId'])if(o.userData[key]!==undefined)tags[key]=true;
     pieces.push({type:o.geometry.type,count:p.count,index:o.geometry.index?.count||0,position:o.position.toArray(),rotation:o.rotation.toArray(),sums:sums.map(n=>Math.round(n*1e6)/1e6||0),tags});
     for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);
    }
   });
   // UV metadata is rendering-only. Saved ownership and selectable tags remain exact.
   return {camera:{orbit:{theta:rig.orbit.theta,phi:rig.orbit.phi,radius:rig.orbit.radius},pan:{...rig.pan},focus:{...rig.focus},targetY:rig.targetY},categories,pieces,vertices,
    materialCount:materials.size,textures:renderer.info.memory.textures,drawCalls:renderer.info.render.calls,
    invalidUVs:[...materials].filter(m=>m.map&&!m.map.image).length};
  }
  fiber=fiber.return;
 }
 throw Error('Preview not mounted');
};
(async()=>{let browser,logs='';const results={templates:[],materials:[]};
 const server=spawn('node',['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3009'],{stdio:['ignore','pipe','pipe']});server.stderr.on('data',d=>logs+=d);
 try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(logs)),20000);server.stdout.on('data',d=>{logs+=d;if(String(d).includes('Ready')){clearTimeout(timer);resolve()}});server.on('exit',c=>reject(Error('Server exit '+c+logs)))});
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  let page;const errors=[];
  const names=['Temple of the Sun','Eternal Courtyard','Celestial Shrine','Marble Pantheon','Cathedral of Echoes','Temple of Unity'];
  const baseline=process.env.QA_COMPARE?JSON.parse(fs.readFileSync(process.env.QA_COMPARE,'utf8')):null;
  for(let i=0;i<names.length;i++){
   if(page)await page.close();
   page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1,hasTouch:true,reducedMotion:'reduce'});
   page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
   await page.goto('http://127.0.0.1:3009');await page.locator('canvas').waitFor();
   await page.getByRole('button',{name:/Explore six designs/}).click();await page.getByRole('button',{name:new RegExp(names[i])}).click();await page.getByRole('button',{name:'Done',exact:true}).first().click();
   await page.getByRole('button',{name:'Center Temple',exact:true}).click();await page.waitForTimeout(900);
   const state=await page.evaluate(inspect);assert.equal(state.invalidUVs,0);results.templates.push({name:names[i],...state});
   if(baseline){const prior=baseline.templates[i];for(const key of ['camera','categories','pieces','vertices'])assert.deepEqual(state[key],prior[key],names[i]+': '+key+' changed');}
   await page.screenshot({path:path.join(output,'template-'+(i+1)+'.png'),timeout:90000});
   if(i===3){await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Center Temple',exact:true}).click();await page.waitForTimeout(500);await page.screenshot({path:path.join(output,'pantheon-portrait.png'),timeout:90000});await page.setViewportSize({width:1280,height:900});}
   console.log('PASS: '+names[i]+(baseline?' — exact geometry, picking tags and camera match baseline':''));
  }
  const design=await page.evaluate(()=>JSON.parse(localStorage.getItem('echoes-temple-builder-v1')));
  for(const kind of ['marble','sandstone','limestone','travertine','granite','stone','brick','concrete','stucco','plaster','timber','bronze','gold','obsidian']){
   await page.evaluate(({design,kind})=>{const value=structuredClone(design);value.levels.forEach(l=>l.material=kind);localStorage.setItem('echoes-temple-builder-v1',JSON.stringify(value));},{design,kind});
   await page.reload();await page.locator('canvas').waitFor();await page.waitForTimeout(400);const state=await page.evaluate(inspect);
   assert.ok(state.vertices>0);assert.equal(state.invalidUVs,0);results.materials.push({kind,textures:state.textures,drawCalls:state.drawCalls});
  }
  assert.deepEqual(errors,[]);results.errors=errors;fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(results,null,2));
  console.log('PASS: all 14 finishes render without JavaScript/WebGL errors');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
