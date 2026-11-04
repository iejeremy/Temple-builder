const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
(async()=>{
 const server=spawn('node',['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3003'],{stdio:['ignore','pipe','pipe']});let browser,logs='';server.stderr.on('data',d=>logs+=d);
 try{
  await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error(logs)),15000);server.stdout.on('data',d=>{logs+=d;if(String(d).includes('Ready')){clearTimeout(t);resolve()}});server.on('exit',c=>reject(Error('Server exit '+c+logs)))});
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:3003');await page.locator('canvas').waitFor();
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('echoes-temple-builder-v1')));
  await page.evaluate(()=>{
   const base={id:'a',buildingId:'a',shape:'rectangle',material:'marble',width:32,depth:26,height:22,roof:'flat',patio:false,x:0,z:0,rotation:0,elevation:0,
    windows:[{id:'window',face:'front',style:'classic',u:0,v:.5,width:1,height:1}],doors:[],arches:[],columns:[],trims:[],stairs:[{id:'stairs',face:'front',style:'wide',u:0}],pediments:[]};
   localStorage.setItem('echoes-temple-builder-v1',JSON.stringify({levels:[base,{...base,id:'upper',elevation:22},{...base,id:'b',buildingId:'b',x:7}],
    perimeter:{style:'rectangle',material:'stone',margin:1,height:1,thickness:.2,towerShape:'round',towers:true,gate:true,arches:false,columns:false},
    siteColumns:[{id:'column',style:'ionic',material:'marble',height:3,radius:.2,x:3,z:4,rotation:0}],
    statues:[{id:'statue',kind:'guardian',finish:'marble',x:-4,z:3,scale:1,rotation:0}],landscapeItems:[{id:'fountain',kind:'fountain',x:4,z:4,scale:1,rotation:0}],scenery:'twilight'}));
  });
  await page.reload();await page.locator('canvas').waitFor();await page.waitForTimeout(200);const original=await saved();
  const clear=page.getByRole('button',{name:'Clear site',exact:true});
  page.once('dialog',d=>d.dismiss());await clear.click();assert.deepEqual(await saved(),original);console.log('PASS: dismissing Clear Site preserves every object');
  page.once('dialog',d=>d.accept());await clear.click();await page.waitForTimeout(100);
  const empty=await saved();for(const key of ['levels','statues','siteColumns','landscapeItems'])assert.deepEqual(empty[key],[]);assert.equal(empty.perimeter,null);assert.equal(empty.scenery,'twilight');assert.ok(await clear.isDisabled());
  console.log('PASS: Clear Site removes all placed objects and saves an empty site');
  await page.getByRole('button',{name:'Undo',exact:true}).click();assert.deepEqual(await saved(),original);console.log('PASS: Undo restores all levels, attachments, perimeter and site objects exactly');
  // Existing single-building deletion and its Undo remain available.
  await page.getByRole('button',{name:'Delete Building',exact:true}).click({trial:true});page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Delete Building',exact:true}).click();
  const deleted=await saved();assert.equal(deleted.levels.length,1);assert.equal(deleted.levels[0].id,'b');assert.deepEqual(deleted.siteColumns,original.siteColumns);
  await page.getByRole('button',{name:'Undo',exact:true}).click();assert.deepEqual(await saved(),original);console.log('PASS: individual-building delete and Undo still preserve other site objects');
  page.once('dialog',d=>d.accept());await clear.click();await page.reload();await page.locator('canvas').waitFor();assert.equal((await saved()).levels.length,0);assert.ok(await clear.isDisabled());console.log('PASS: cleared design remains empty after reload');
  // An unconfirmed building must also be clearable/restorable.
  await page.getByRole('button',{name:'Start from a foundation'}).click();await page.getByRole('button',{name:'5-Point Star',exact:true}).click();assert.ok(await page.getByRole('button',{name:'Confirm placement'}).isVisible());
  page.once('dialog',d=>d.accept());await clear.click();assert.equal(await page.getByRole('button',{name:'Confirm placement'}).count(),0);
  await page.getByRole('button',{name:'Undo',exact:true}).click();assert.ok(await page.getByRole('button',{name:'Confirm placement'}).isVisible());await page.getByRole('button',{name:'Confirm placement'}).click();assert.equal((await saved()).levels[0].shape,'star');console.log('PASS: pending placement is cleared and recoverable with Undo');
  page.once('dialog',d=>d.accept());await clear.click();
  await page.getByRole('button',{name:'Start from a foundation'}).click();await page.getByRole('button',{name:'Circle',exact:true}).click();await page.getByRole('button',{name:'Confirm placement'}).click();
  page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal((await saved()).levels[0].shape,'circle');
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal((await saved()).levels[0].shape,'star');console.log('PASS: restoring after new work requires confirmation');
  assert.deepEqual(errors,[]);console.log('PASS: no browser runtime errors');
  await page.screenshot({path:process.env.QA_SCREENSHOT||'/tmp/echoes-clear-site.png'});
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
