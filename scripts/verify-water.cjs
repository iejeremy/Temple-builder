const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const inspect=()=>{
 const host=document.querySelector('canvas').parentElement;let f=host[Object.keys(host).find(k=>k.startsWith('__reactFiber'))];
 while(f){const refs=[];let h=f.memoizedState;while(h&&typeof h==='object'){if(h.memoizedState&&typeof h.memoizedState==='object'&&'current'in h.memoizedState)refs.push(h.memoizedState.current);h=h.next;}
 const group=refs.find(g=>g?.isGroup&&g.children.some(o=>o.userData.siteObjectId)),camera=refs.find(c=>c?.isPerspectiveCamera);
 if(group&&camera){const river=group.children.find(g=>g.children.some(m=>m.name==='water-surface'))||group.children[0];const p=river.position.clone();p.y=.065;p.project(camera);const rect=host.getBoundingClientRect();return {point:{x:rect.left+(p.x+1)*rect.width/2,y:rect.top+(1-p.y)*rect.height/2},pieces:group.children.filter(g=>g.userData.siteObjectId).map(g=>{const water=g.getObjectByName('water-surface'),bank=g.getObjectByName('water-bank');return {id:g.userData.siteObjectId,normal:!!water?.material.normalMap,metal:water?.material.metalness,alpha:bank?.geometry.getAttribute('color')?.itemSize};})};}
 f=f.return;}throw Error('Mounted water scene unavailable');
};
(async()=>{const server=spawn('node',['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3006'],{stdio:['ignore','pipe','pipe']});let browser,logs='';server.stderr.on('data',d=>logs+=d);
try{await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(logs)),20000);server.stdout.on('data',d=>{logs+=d;if(String(d).includes('Ready')){clearTimeout(timer);resolve()}});server.on('exit',c=>reject(Error('Server exited '+c+logs)))});
browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];page.setDefaultTimeout(60000);page.setDefaultNavigationTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.goto('http://127.0.0.1:3006',{waitUntil:'domcontentloaded'});await page.locator('canvas').waitFor();
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('echoes-temple-builder-v1')));
await page.getByRole('button',{name:'+ Add',exact:true}).click();await page.getByRole('button',{name:/Scenery/}).click();
for(const kind of ['river','creek'])await page.getByRole('button',{name:'+ '+kind,exact:true}).click();
await page.getByRole('spinbutton',{name:'river x',exact:true}).fill('-3');await page.getByRole('spinbutton',{name:'creek x',exact:true}).fill('3');await page.getByRole('spinbutton',{name:'creek rotation',exact:true}).fill('90');
await page.getByRole('button',{name:'Done',exact:true}).first().click();await page.getByRole('button',{name:'Plan',exact:true}).click();await page.mouse.move(170,350);await page.mouse.wheel(0,400);
const label=process.env.QA_LABEL||'water';await page.screenshot({timeout:90000,path:'/tmp/echoes-'+label+'-water-plan.png'});
const initial=await saved();assert.deepEqual(initial.landscapeItems.map(i=>i.kind),['river','creek']);
let state=await page.evaluate(inspect);if(label!=='baseline'){assert.ok(state.pieces.every(p=>p.normal&&p.metal===0&&p.alpha===4));console.log('PASS: actual water materials and feathered banks mounted for both kinds');}
await page.getByRole('button',{name:'Move',exact:true}).click();state=await page.evaluate(inspect);await page.mouse.move(state.point.x,state.point.y);await page.mouse.down();await page.mouse.move(state.point.x+35,state.point.y,{steps:4});await page.mouse.up();
const moved=await saved();assert.ok(moved.landscapeItems[0].x!==initial.landscapeItems[0].x||moved.landscapeItems[0].z!==initial.landscapeItems[0].z);assert.deepEqual(moved.landscapeItems[1],initial.landscapeItems[1]);console.log('PASS: deliberate drag moves only the grabbed river');
await page.getByRole('button',{name:'Moving',exact:true}).click();await page.reload({waitUntil:'domcontentloaded'});await page.locator('canvas').waitFor();assert.deepEqual(await saved(),moved);console.log('PASS: river and creek transforms survive reload');
await page.getByRole('button',{name:'View landscape',exact:true}).click();await page.screenshot({timeout:90000,path:'/tmp/echoes-'+label+'-water-site.png'});
await page.setViewportSize({width:844,height:390});await page.getByRole('button',{name:'Whole site',exact:true}).click();await page.screenshot({timeout:90000,path:'/tmp/echoes-'+label+'-water-landscape.png'});
page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Clear site',exact:true}).click();assert.equal((await saved()).landscapeItems.length,0);await page.getByRole('button',{name:'Undo',exact:true}).click();assert.deepEqual(await saved(),moved);console.log('PASS: Clear Site/Undo restores water exactly');assert.deepEqual(errors,[]);console.log('PASS: portrait, landscape and no JavaScript/WebGL console errors ('+label+')');
}finally{if(browser)await browser.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1});
