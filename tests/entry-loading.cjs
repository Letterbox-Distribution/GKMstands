const {chromium}=require('playwright');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  // A slow graphics startup must not hold the visitor on the intro indefinitely.
  await page.route('**/showcase-render.worker.mjs',async route=>{
   await new Promise(resolve=>setTimeout(resolve,3500));
   await route.continue().catch(()=>{});
  });
  await page.goto((process.env.BASE_URL||'http://127.0.0.1:5001')+'/?live=1');
  await page.waitForFunction(()=>document.body.dataset.entryReady==='true');
  const timing=await page.evaluate(()=>performance.getEntriesByName('entry-complete')[0].startTime);
  assert.ok(timing<2800,'intro took '+Math.round(timing)+' ms');
  assert.equal(await page.locator('body').getAttribute('data-entry-render'),'cached-opening');
  assert.equal(await page.locator('.showcase-instant img').evaluate(image=>image.complete&&image.naturalWidth>0),true);
  await page.waitForFunction(()=>document.querySelector('#showcase').dataset.ready==='true',null,{timeout:90000});
  await page.waitForFunction(()=>!document.querySelector('.showcase-instant'));
  assert.deepEqual(errors,[]);
  console.log('PASS intro '+Math.round(timing)+' ms despite delayed GPU startup; matching opening render and live handoff');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
