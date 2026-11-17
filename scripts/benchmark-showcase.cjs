const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.BASE_URL||'http://127.0.0.1:5001';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
 try{
  for(const width of [1440,390])for(const mode of ['live','images','motion']){
   const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:2});
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});let transferred=0;cdp.on('Network.loadingFinished',event=>transferred+=event.encodedDataLength);
   await page.goto(base+(mode==='live'?'/?live=1':mode==='images'?'/?frames=1&images=1':'/'),{waitUntil:'commit'});
   await page.waitForFunction(()=>document.querySelector('#showcase')?.dataset.ready==='true',null,{timeout:90000});
   const readyMs=await page.evaluate(()=>performance.now());const initialBytes=transferred;
   const metrics=await page.evaluate(async()=>{
    const root=document.querySelector('#showcase'),stage=root.querySelector('.showcase-stage');
    const distance=root.offsetHeight-stage.offsetHeight;const times=[],latencies=[];
    let requested=0,requestedAt=0;
    const observer=new MutationObserver(()=>{const shown=Number(root.dataset.renderProgress);if(requestedAt&&Math.abs(shown-requested)<.012){latencies.push(performance.now()-requestedAt);requestedAt=0;}});
    observer.observe(root,{attributes:true,attributeFilter:['data-render-progress']});
    let last=performance.now();
    for(let index=0;index<240;index++){
     await new Promise(resolve=>requestAnimationFrame(now=>{times.push(now-last);last=now;resolve();}));
     // Forward, reverse, rapid jump, then forward again, all driven by real scroll position.
     requested=index<60?index/85:index<120?(120-index)/85:index<180?.8-(index-120)/100:(index-180)/85;
     requestedAt=performance.now();scrollTo({top:distance*requested,behavior:'instant'});
    }
    await new Promise(resolve=>setTimeout(resolve,300));observer.disconnect();
    const sorted=[...times].sort((a,b)=>a-b),lat=[...latencies].sort((a,b)=>a-b),average=times.reduce((a,b)=>a+b,0)/times.length;
    const canvas=root.querySelector('canvas');
    return {renderer:root.dataset.renderer,fps:1000/average,averageFrameMs:average,p95FrameMs:sorted[Math.floor(sorted.length*.95)],maxFrameMs:sorted.at(-1),delayedFrames:times.filter(n=>n>25).length,frames:times.length,responseSamples:lat.length,p95ResponseMs:lat[Math.floor(lat.length*.95)]||null,jsHeapBytes:performance.memory?.usedJSHeapSize||null,decodedCacheBytes:Number(canvas?.dataset.sequenceCacheBytes||0)};
   });
   results.push({width,mode,readyMs,initialBytes,totalBytes:transferred,...metrics,errors});console.log(JSON.stringify(results.at(-1)));
   await page.screenshot({path:path.join(process.env.TEMP||'/tmp','gkm-benchmark-'+mode+'-'+width+'.png')});await context.close();
  }
 }finally{await browser.close();}
 const output=process.env.BENCHMARK_OUTPUT||path.join(process.env.TEMP||'/tmp','gkm-showcase-benchmark.json');fs.writeFileSync(output,JSON.stringify({measuredAt:new Date().toISOString(),method:'Chrome headless, cold HTTP cache, DPR 2, 240 requestAnimationFrame-driven scroll steps. JS heap excludes external/GPU memory; decoded cache reported separately. Frame timing measures browser responsiveness, not GPU presentation FPS.',results},null,2));console.log('Saved',output);
})().catch(error=>{console.error(error);process.exitCode=1});
