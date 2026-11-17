const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.addInitScript(()=>{window.timerGaps=[];let previous=performance.now();setInterval(()=>{const now=performance.now();window.timerGaps.push(now-previous);previous=now;},25);});
  const cdp=await page.context().newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  await page.goto(process.env.BASE_URL||'http://127.0.0.1:5000',{waitUntil:'commit'});
  await page.waitForFunction(()=>document.querySelector('.showcase-instant img')?.complete);
  await page.waitForFunction(()=>document.body?.dataset.entryReady==='true',null,{timeout:90000});
  await page.evaluate(()=>{window.timerGaps=[];window.scrollUpdates=0;const timer=setInterval(()=>{scrollBy({top:22,behavior:'instant'});if(++window.scrollUpdates===80)clearInterval(timer)},40)});
  await page.waitForFunction(()=>window.scrollUpdates===80);
  const maxGap=await page.evaluate(()=>Math.max(...window.timerGaps));assert.ok(maxGap<1500,'Scrolling thread blocked for '+Math.round(maxGap)+' ms');
  assert.equal(requests.some(u=>u.endsWith('/static/app.mjs')),false,'planner was loaded before needed');
  assert.equal(requests.some(u=>u.endsWith('/static/vendor/leaflet.js')),false,'map library was eagerly loaded');
  assert.equal(requests.some(u=>u.includes('airport-lounge-photo.png')),false,'removed studio image was downloaded');
  assert.equal(requests.some(u=>u.includes('goldkey-airport-hero-luxury.webp')),false,'hidden legacy hero image was downloaded');
  assert.equal(await page.locator('#stand-studio').count(),0);
  await page.waitForFunction(()=>document.querySelector('#showcase')?.dataset.ready==='true',null,{timeout:90000});
  assert.equal(await page.locator('#showcase').getAttribute('data-renderer'),'sequence');
  await page.locator('[data-go="3"]').click();await page.waitForFunction(()=>Number(document.querySelector('#showcase')?.dataset.renderProgress)>.86);
  await page.locator('[data-pocket="5"]').click();await page.waitForFunction(()=>document.querySelector('#showcase-viewport canvas').dataset.selectedSlot==='bottom-3');
  await page.locator('#showcase-file').setInputFiles(path.resolve('static/artwork/your-edition.png'));await page.waitForFunction(()=>document.querySelector('#showcase')?.dataset.artwork==='custom');
  await page.locator('[data-chapter="3"] a[href="/plan"]').click();await page.waitForFunction(()=>document.body?.dataset.bookingReady==='true');
  assert.equal(await page.locator('#showcase').count(),0,'booking should not load a second hero');
  await page.locator('.header a[href="/#showcase"]').click();await page.waitForFunction(()=>document.body?.dataset.entryReady==='true');
  await page.locator('#open-stand').click();await page.waitForFunction(()=>Math.abs(Number(document.querySelector('#showcase')?.dataset.renderProgress)-.55)<.01);
  assert.deepEqual(errors,[]);
  console.log('PASS cold-refresh scroll, max timer gap '+Math.round(maxGap)+' ms; deferred planner/map; no duplicate studio; hybrid artwork upload, separate booking page and return to stand');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
