const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5000');await page.locator('.hero-discover').click();await page.locator('#campaign-type').selectOption('general');await page.locator('#show-matches').click();
  assert.equal(await page.locator('.demo-location-dot').count(),150);
  assert.equal(await page.locator('.location-hit-target[role=button]').count(),150);
  await page.locator('[data-city=Birmingham]').click();await page.locator('[data-city=Manchester]').click();
  assert.equal(await page.locator('.excluded-location-dot').count(),100);
  await page.locator('[data-location-id="London-6"]').focus();await page.keyboard.press('Enter');
  assert.match(await page.locator('#location-profile-title').textContent(),/London Hotel lounge 06/);
  assert.match(await page.locator('.profile-classification').textContent(),/Not bookable/);
  assert.match(await page.locator('.profile-data-note').textContent(),/not verified/);
  assert.equal(await page.locator('.demo-location-dot.is-active').count(),1);
  assert.equal(await page.locator('.selection-beacon').count(),1);
  assert.equal(await page.locator('#map-location-profile [data-select]').count(),0);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#map-location-profile').isVisible(),false);
  await page.locator('.leaflet-marker-icon[title^="Bloomsbury Exchange:"]').click();
  assert.match(await page.locator('#location-profile-title').textContent(),/Bloomsbury Exchange/);
  assert.match(await page.locator('.profile-stats').textContent(),/12,500/);
  await page.locator('#map-location-profile [data-select]').click();
  await page.locator('#slot').selectOption('bottom-left');await page.locator('#add-placement').click();
  assert.match(await page.locator('#item-count').textContent(),/1 placement/);
  await page.locator('#clear').click();await page.locator('#campaign-type').selectOption('general');await page.locator('#show-matches').click();assert.equal(await page.locator('.demo-location-dot').count(),150);
  await page.setViewportSize({width:390,height:844});await page.locator('#planner').scrollIntoViewIfNeeded();
  await page.locator('[data-location-id="London-1"]').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('#map-location-profile').isVisible(),true);
  await page.locator('[data-profile-browse]').click();
  assert.equal(await page.locator('#map-location-profile').isVisible(),false);
  assert.equal(await page.locator('.venue-row').count(),3);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.ok(await page.locator('.map-legend').evaluate(e=>e.getBoundingClientRect().height<80));
  assert.deepEqual(errors,[]);
  console.log('PASS: 150 interactive points, city exclusions, keyboard profiles, active glow, example disclosure, venue stats, placement selection, mobile profile and no JS errors');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
