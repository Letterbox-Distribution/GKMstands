const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const base=process.env.BASE_URL||'http://127.0.0.1:5001';
(async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.resolve('static/showcase-sequence/manifest.json'),'utf8'));
 for(const variant of Object.values(manifest.variants))for(let i=1;i<variant.frames.length;i++)assert(Number(variant.frames[i].camera)>Number(variant.frames[i-1].camera),'captured camera must keep moving between chapters');
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  for(const width of [390,1440]){
   const page=await browser.newPage({viewport:{width,height:1000},deviceScaleFactor:2}),errors=[],requests=[];
   page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>requests.push(request.url()));
   await page.goto(base);await page.waitForFunction(()=>document.querySelector('#showcase')?.dataset.ready==='true');
   await page.waitForFunction(()=>document.body.dataset.entryReady==='true');
   assert.equal(await page.locator('#showcase').getAttribute('data-renderer'),'sequence');
   assert(!requests.some(url=>url.includes('showcase-render.worker.mjs')),'eager live renderer');
   const seek=async progress=>{
    await page.evaluate(progress=>{const root=document.querySelector('#showcase');scrollTo({top:(root.offsetHeight-root.querySelector('.showcase-stage').offsetHeight)*progress,behavior:'instant'});},progress);
    await page.waitForFunction(progress=>Math.abs(Number(document.querySelector('#showcase').dataset.renderProgress)-progress)<.006,progress);
   };
   for(const progress of [.8,.12,.66,.26,.91]){await seek(progress);const dimensions=await page.locator('#showcase-viewport canvas').evaluate(c=>[Number(c.dataset.sequenceSourceWidth),Number(c.dataset.sequenceSourceHeight)]);assert.deepEqual(dimensions,width<=760?[780,1824]:[2880,1820],'motion frame must retain native resolution');}
   await page.waitForFunction(()=>document.querySelector('#showcase-viewport canvas').dataset.sequenceQuality==='full');
   assert(Number(await page.locator('#showcase-viewport canvas').getAttribute('data-sequence-cache-bytes'))<=72*1024*1024);
   assert.equal(await page.locator('.native-screen-layer').isVisible(),false);
   await page.locator('[data-pocket="5"]').click();
   await page.waitForFunction(()=>document.querySelector('#showcase').dataset.renderer==='hybrid-live',null,{timeout:60000});
   await page.waitForFunction(()=>document.querySelector('#showcase-viewport canvas').dataset.selectedSlot==='bottom-3');
   await page.locator('#showcase-file').setInputFiles(path.resolve('static/artwork/your-edition.png'));
   await page.waitForFunction(()=>document.querySelector('#showcase').dataset.artwork==='custom');
   await page.locator('[data-pocket="1"]').click();
   await page.waitForFunction(()=>document.querySelector('#showcase-viewport canvas').dataset.selectedSlot==='top-3');
   assert.deepEqual(errors,[]);await page.close();console.log('PASS '+width+'px sequence, reverse/jump, full-quality settle, bounded cache, live selection and artwork');
  }
  const failure=await browser.newPage({viewport:{width:1440,height:1000}});
  await failure.route('**/showcase-sequence/manifest.json',route=>route.fulfill({status:404,body:'missing'}));
  await failure.goto(base);await failure.waitForFunction(()=>document.querySelector('#showcase')?.dataset.ready==='true',null,{timeout:60000});
  assert.equal(await failure.locator('#showcase').getAttribute('data-renderer'),'worker');await failure.close();
  console.log('PASS missing manifest falls back to live 3D');
  const missingFrame=await browser.newPage({viewport:{width:1440,height:1000}});
  await missingFrame.route('**/showcase-sequence/*/desktop/*.webp*',route=>route.fulfill({status:404,body:'missing frame'}));
  await missingFrame.goto(base);await missingFrame.waitForFunction(()=>document.querySelector('#showcase')?.dataset.renderer==='hybrid-live',null,{timeout:60000});
  await missingFrame.close();console.log('PASS missing frame files activate live fallback');
  const resize=await browser.newPage({viewport:{width:1440,height:1000}});
  await resize.goto(base);await resize.waitForFunction(()=>document.querySelector('#showcase')?.dataset.ready==='true');
  await resize.setViewportSize({width:390,height:844});
  await resize.waitForFunction(()=>document.querySelector('#showcase-viewport canvas')?.dataset.sequenceQuality==='full');
  assert(await resize.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await resize.goto(base+'/plan');await resize.goBack();
  await resize.waitForFunction(()=>document.querySelector('#showcase')?.dataset.ready==='true');
  await resize.close();console.log('PASS mobile resize and repeated navigation');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
