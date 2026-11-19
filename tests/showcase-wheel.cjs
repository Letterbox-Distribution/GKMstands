// Measure displayed poses during native wheel input, rather than page rAF alone.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.BASE_URL||'http://127.0.0.1:5001';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  for(const width of [1440,390])for(const skipIntro of [false,true]){
   const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:2});
   const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
   const cdp=await page.context().newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
   await page.addInitScript(skipIntro=>{
    if(skipIntro)sessionStorage.setItem('goldkey-entry-seen','true');
    window.poseSamples=[];
    function sample(t){
     const root=document.querySelector('#showcase');
     if(window.measurePoses)poseSamples.push({t,target:Number(root.dataset.progress),pose:Number(root.dataset.renderProgress||0)});
     requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
   },skipIntro);
   await page.goto(base+'/showcase');
   await page.waitForFunction(()=>document.body.dataset.entryReady==='true');
   // Begin measuring on the first wheel event; never wait for GPU warmup.
   await page.mouse.move(width*.65,450);
   await page.evaluate(()=>{window.measurePoses=true;});
   for(const [count,delta,delay] of [[28,40,65],[25,-40,65],[8,140,35]]){
    for(let i=0;i<count;i++){await page.mouse.wheel(0,delta);await page.waitForTimeout(delay);}
   }
   await page.waitForTimeout(200);
   const samples=await page.evaluate(()=>{window.measurePoses=false;return poseSamples;});
   let start=samples[0],previous=start,maxHold=0,changes=0;
   for(const sample of samples.slice(1)){
    if(sample.pose!==start.pose){
     if(Math.abs(previous.target-start.target)>.003)maxHold=Math.max(maxHold,previous.t-start.t);
     changes++;start=sample;
    }
    previous=sample;
   }
   if(Math.abs(previous.target-start.target)>.003)maxHold=Math.max(maxHold,previous.t-start.t);
   require('fs').writeFileSync(require('path').join(require('os').tmpdir(),'gkm-first-wheel-'+width+(skipIntro?'-refresh':'')+'.json'),JSON.stringify({samples,changes,maxHold}));
   console.log({width,skipIntro,changes,maxHold});
   assert(changes>80,`Only ${changes} displayed pose changes at ${width}px`);
   assert(maxHold<250,`Stand held for ${Math.round(maxHold)}ms during moving input at ${width}px`);
   assert(!requests.some(url=>url.includes('showcase-render.worker.mjs')),'First scrolling must not start graphics compilation');
   assert.deepEqual(errors,[]);
   assert.equal(await page.locator('.native-screen-layer').isVisible(),false,'screen must remain inside the stand render');
   console.log(`PASS ${width}px ${skipIntro?'intro skipped':'first visit'} cold native wheel: ${changes} pose changes, longest moving hold ${Math.round(maxHold)}ms; forward, reverse and fast input`);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
