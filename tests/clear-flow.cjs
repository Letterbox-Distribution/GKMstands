const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.BASE_URL||'http://127.0.0.1:5000';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base);await page.waitForFunction(()=>document.body.dataset.entryReady==='true');
  assert.equal(await page.locator('#planner').count(),0);
  assert.deepEqual(await page.locator('main>section').evaluateAll(sections=>sections.map(section=>section.id).filter(Boolean)),['showcase','editorial-setting','about','the-service']);
  await page.locator('.header .nav-start').click();await page.waitForFunction(()=>document.body.dataset.bookingReady==='true');
  assert.equal(await page.locator('#showcase').count(),0);
  await page.locator('#booking-brief button[type=submit]').click();assert.equal(await page.locator('#brief-error').isVisible(),true);
  await page.locator('[data-campaign=travel]').click();await page.locator('#booking-budget').fill('100');
  await page.locator('#booking-brief button[type=submit]').click();await page.waitForFunction(()=>document.body.dataset.step==='2');
  await page.waitForSelector('.booking-map-cluster');await page.locator('.booking-venue-image').first().click();
  const spaces=page.locator('.booking-spaces:not([hidden]) [data-select-space]');assert.equal(await spaces.count(),6);
  await spaces.first().click();assert.equal(await page.locator('.booking-selected-badge').count(),1);assert.equal(await page.locator('#basket-budget').isVisible(),true);
  await page.locator('#booking-review').click();await page.waitForFunction(()=>document.body.dataset.step==='3');
  assert.equal(await page.locator('#booking-review-lines .booking-review-line').count(),1);
  await page.locator('input[name=name]').fill('Browser QA');await page.locator('input[name=email]').fill('browser@example.test');await page.locator('input[name=consent]').check();
  // SQLite persistence has isolated Python tests; this browser test never adds customer queue records.
  let requests=0;await page.route('**/api/booking-requests',async route=>{
   requests++;await route.fulfill({status:requests===1?503:201,contentType:'application/json',body:JSON.stringify(requests===1?{error:'Please try again. Your campaign is still here.'}:{reference:'GKE-QA-TEST0001',status:'awaiting_confirmation',total_pence:14000})});
  });
  await page.locator('#booking-send').click();await page.waitForSelector('#booking-submit-error:not([hidden])');assert.equal(await page.locator('input[name=email]').inputValue(),'browser@example.test');
  await page.locator('#booking-send').click();await page.waitForFunction(()=>document.body.dataset.step==='4');assert.equal(await page.locator('#booking-reference').textContent(),'GKE-QA-TEST0001');assert.equal(requests,2);
  await page.reload();await page.waitForFunction(()=>document.body.dataset.step==='4');assert.equal(requests,2);
  await page.locator('#booking-new').click();await page.waitForFunction(()=>document.body.dataset.step==='1');assert.equal(await page.locator('[data-campaign][aria-pressed=true]').count(),0);
  for(const width of [390,768,1024,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'overflow at '+width);}
  assert.deepEqual(errors,[]);console.log('PASS homepage, separate campaign page, six spaces, over-budget review, retry, receipt refresh and responsive widths');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
