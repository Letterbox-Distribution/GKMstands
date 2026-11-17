// Measure displayed poses during native wheel input, rather than page rAF alone.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.BASE_URL||'http://127.0.0.1:5001';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:2});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{
    window.poseSamples=[];
    function sample(t){
     const root=document.querySelector('#showcase');
     if(window.measurePoses)poseSamples.push({t,target:Number(root.dataset.progress),pose:Number(root.dataset.renderProgress)});
     requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
   });
   await page.goto(base);
   await page.waitForFunction(()=>document.body.dataset.entryReady==='true');
   // Exercise the cold handover with actual input too.
   await page.mouse.move(width*.65,450);
   for(let i=0;i<12;i++){await page.mouse.wheel(0,35);await page.waitForTimeout(65);}
   await page.waitForFunction(()=>document.querySelector('#showcase').dataset.renderer==='hybrid-live',null,{timeout:60000});
   await page.waitForTimeout(250);
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
   assert(changes>80,`Only ${changes} displayed pose changes at ${width}px`);
   assert(maxHold<250,`Stand held for ${Math.round(maxHold)}ms during moving input at ${width}px`);
   assert.deepEqual(errors,[]);
   assert.equal(await page.locator('.native-screen-layer').isVisible(),false,'screen must remain inside the stand render');
   console.log(`PASS ${width}px native wheel: ${changes} pose changes, longest moving hold ${Math.round(maxHold)}ms; forward, reverse and fast input`);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
