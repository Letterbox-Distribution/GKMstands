// Run after generating frames and starting Flask: node scripts/benchmark-showcase.cjs
// Reports browser-side frame pacing, not a substitute for physical iPhone testing.
const { chromium } = require('playwright');
const base = process.env.GKM_URL || 'http://127.0.0.1:5000';
async function measure(browser, mode) {
 const page = await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
 try {
  await page.goto(base + (mode==='live'?'?renderer=main':''),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#showcase')?.dataset.ready==='true',{timeout:90000});
  const result=await page.evaluate(async()=>{
   const root=document.querySelector('#showcase'),stage=root.querySelector('.showcase-stage');
   const start=scrollY+root.getBoundingClientRect().top,range=root.offsetHeight-stage.offsetHeight;
   const deltas=[];
   let last=0;
   await new Promise(resolve=>{
    let step=0;
    function tick(now){
     if(last)deltas.push(now-last);last=now;
     scrollTo({top:start+range*(step/180),behavior:'instant'});
     if(++step<=180)requestAnimationFrame(tick);else resolve();
    }
    requestAnimationFrame(tick);
   });
   deltas.sort((a,b)=>a-b);
   return {renderer:root.dataset.renderer||'main',samples:deltas.length,averageFrameMs:deltas.reduce((a,b)=>a+b,0)/deltas.length,p95FrameMs:deltas[Math.floor(deltas.length*.95)],over16ms:deltas.filter(v=>v>16.7).length,over33ms:deltas.filter(v=>v>33.3).length};
  });
  return {mode,...result};
 } finally {await page.close();}
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const live=await measure(browser,'live'),sequence=await measure(browser,'sequence');
  console.log(JSON.stringify({live,sequence},null,2));
  if(sequence.renderer!=='sequence')console.warn('Sequence assets not installed: benchmark fell back to live rendering.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
