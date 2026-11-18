const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.BASE_URL||'http://127.0.0.1:5001';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:2});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base);await page.waitForFunction(()=>document.body.dataset.entryReady==='true');
   async function checkWhite(label){
    const pixels=await page.locator('#showcase-viewport canvas').evaluate(canvas=>{
     const ctx=canvas.getContext('2d');
     return [.005,.995].map(x=>[...ctx.getImageData(Math.floor(canvas.width*x),Math.floor(canvas.height*.2),1,1).data].slice(0,3));
    });
    for(const rgb of pixels)assert(rgb.every(value=>value>=250),`${width}px ${label}: grey background ${rgb}`);
   }
   for(const progress of [.5,.6,.9]){
    await page.evaluate(progress=>{const r=document.querySelector('#showcase');scrollTo(0,(r.offsetHeight-r.querySelector('.showcase-stage').offsetHeight)*progress);},progress);
    await page.waitForFunction(progress=>Math.abs(Number(document.querySelector('#showcase').dataset.renderProgress)-progress)<.006,progress);
    await page.waitForFunction(()=>document.querySelector('#showcase-viewport canvas').dataset.sequenceQuality==='full');
    await checkWhite('settled '+progress);
   }
   await page.evaluate(()=>{
    const r=document.querySelector('#showcase'),distance=r.offsetHeight-r.querySelector('.showcase-stage').offsetHeight;
    window.backgroundScroll=setInterval(()=>scrollTo(0,distance*(.65+Math.sin(performance.now()/600)*.05)),30);
   });
   await page.waitForFunction(()=>{
    const r=document.querySelector('#showcase'),p=Number(r.dataset.renderProgress);
    return p>.55&&p<.75&&r.querySelector('canvas').dataset.sequenceQuality==='video-native';
   });
   for(let i=0;i<5;i++){await checkWhite('moving');await page.waitForTimeout(45);}
   await page.evaluate(()=>clearInterval(window.backgroundScroll));
   assert.deepEqual(errors,[]);
   await page.close();console.log(`PASS ${width}px pure-white background during motion and settled poses`);
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
