const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
  if(process.env.ADVERT_HD==='1')await page.addInitScript(()=>{Object.defineProperty(navigator,'mediaCapabilities',{value:{decodingInfo:async()=>({supported:true,smooth:true,powerEfficient:true})}});Object.defineProperty(navigator,'connection',{value:{saveData:false,effectiveType:'4g'}});});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.BASE_URL||'http://127.0.0.1:5000')+'/showcase');
  await page.waitForFunction(()=>document.body.dataset.entryReady==='true',null,{timeout:90000});
  await page.waitForFunction(()=>document.querySelector('.native-screen-video')?.currentTime>.25);
  const metadata=await page.locator('.native-screen-video').evaluate(v=>({width:v.videoWidth,height:v.videoHeight,duration:v.duration,muted:v.muted,loop:v.loop,hidden:v.hidden,transform:getComputedStyle(v).transform}));
  assert.equal(metadata.duration,18);if(process.env.ADVERT_HD==='1'){assert.equal(metadata.width,1080);assert.equal(metadata.height,1920);}assert.equal(metadata.muted&&metadata.loop,true);assert.equal(metadata.hidden,false);assert.match(metadata.transform,/matrix3d/);
  await page.evaluate(()=>{const v=document.querySelector('.native-screen-video');window.advertLoops=0;let previous=v.currentTime;v.addEventListener('timeupdate',()=>{if(previous>16&&v.currentTime<1)window.advertLoops++;previous=v.currentTime;});});
  // Observe a real natural wrap; do not seek to manufacture a loop.
  await page.waitForFunction(()=>window.advertLoops>=1,null,{timeout:24000});
  const transform=await page.locator('.native-screen-video').evaluate(v=>v.style.transform);
  await page.evaluate(()=>{const r=document.querySelector('#showcase');scrollTo({top:(r.offsetHeight-r.querySelector('.showcase-stage').offsetHeight)*.26,behavior:'instant'})});
  await page.waitForFunction(()=>Math.abs(Number(document.querySelector('#showcase').dataset.renderProgress)-.26)<.01);
  assert.equal(await page.locator('.native-screen-video').evaluate(v=>v.paused),false);
  assert.notEqual(await page.locator('.native-screen-video').evaluate(v=>v.style.transform),transform);
  await page.locator('[data-go="3"]').click();await page.waitForFunction(()=>Number(document.querySelector('#showcase').dataset.renderProgress)>.86);
  assert.equal(await page.locator('.native-screen-video').evaluate(v=>v.paused),true);
  await page.locator('[data-go="0"]').click();await page.waitForFunction(()=>Number(document.querySelector('#showcase').dataset.renderProgress)<.01);await page.waitForFunction(()=>!document.querySelector('.native-screen-video').paused);
  assert.deepEqual(errors,[]);
  console.log('PASS 18-second native advert, natural seamless loop, projected screen alignment, continuous playback during scroll, hidden-screen pause/resume and no page errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
