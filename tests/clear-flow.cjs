const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.BASE_URL||'http://127.0.0.1:5000');
  assert.equal(await page.locator('#match-results').isVisible(),false);
  assert.equal(await page.locator('#order').isVisible(),false);
  assert.equal(await page.locator('#nav-review').isVisible(),false);
  await page.locator('.hero-discover').click();
  if(await page.locator('#showcase').count())await page.waitForFunction(()=>document.body.dataset.plannerReady==='true');
  const choices=await page.locator('[data-campaign-choice]').count();assert.equal(await page.locator(choices?'[data-campaign-choice]':'#campaign-type').first().evaluate(e=>e===document.activeElement),true);
  assert.equal(await page.locator('#show-matches').isDisabled(),true);
  assert.equal(await page.locator('.audience-menu').isVisible(),false);
  if(choices)await page.locator('[data-campaign-choice=travel]').click();else await page.locator('#campaign-type').selectOption('travel');
  assert.equal(await page.locator('.audience-menu').isVisible(),true);
  await page.locator('#budget').fill('500');await page.locator('#weeks').fill('2');
  assert.equal(await page.locator('#match-results').isVisible(),false);
  await page.locator('#show-matches').click();
  assert.equal(await page.locator('#match-results').isVisible(),true);
  await page.waitForFunction(()=>document.querySelectorAll('.demo-location-dot').length===150);
  assert.equal(await page.locator('[data-flow-step="2"]').getAttribute('aria-current'),'step');
  await page.locator('#add-suggested').click();
  assert.equal(await page.locator('#order').isVisible(),true);
  assert.ok(await page.locator('.order-line').count()>0);
  assert.ok(Number((await page.locator('#order-total').textContent()).replace(/[^\d.]/g,''))<=500);
  assert.equal(await page.locator('[data-flow-step="3"]').getAttribute('aria-current'),'step');
  await page.locator('#close-order').click();
  assert.equal(await page.locator('[data-flow-step="2"]').getAttribute('aria-current'),'step');
  await page.locator('#open-stand').click();
  if(await page.locator('#showcase').count()){
   assert.equal(await page.locator('#stand-preview-disclosure').count(),0);
   await page.waitForFunction(()=>Number(document.querySelector('#showcase').dataset.renderProgress)>.5);
   assert.equal(await page.locator('#showcase-viewport canvas').getAttribute('data-magazines'),'12');
  }else{
   await page.waitForFunction(()=>document.querySelector('#stand-viewport').dataset.ready==='true');
   assert.equal(await page.locator('#stand-preview-disclosure').evaluate(e=>e.open),true);
  }
  for(const width of [390,768,1024,1440]){
   await page.setViewportSize({width,height:1000});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'overflow at '+width);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: clear start, progressive brief, explicit results, budget-fitting selection, numbered review, back navigation, hero navigation without duplicate studio and responsive widths');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
