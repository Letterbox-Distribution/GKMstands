const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.BASE_URL||'http://127.0.0.1:5001';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto(base+'/plan');await page.locator('[data-campaign=travel]').click();await page.locator('#booking-brief button[type=submit]').click();
   for(const index of [0,3]){
    const card=page.locator('.booking-venue').nth(index),name=await card.locator('h3').textContent();await card.locator('.booking-venue-image').click();
    if(width<500&&!(await page.locator('#booking-map-panel').getAttribute('class')).includes('is-open'))await page.locator('#booking-map-toggle').click();
    await page.waitForFunction(name=>document.querySelector('#booking-map').getAttribute('aria-label')==='Map centred on '+name,name);
    await page.waitForFunction(name=>{
     const map=document.querySelector('#booking-map').getBoundingClientRect();
     const pin=[...document.querySelectorAll('.booking-map-pin')].find(pin=>pin.title.endsWith(': '+name));if(!pin)return false;
     const bounds=pin.getBoundingClientRect();return Math.abs(bounds.x+bounds.width/2-map.x-map.width/2)<12&&Math.abs(bounds.y+bounds.height/2-map.y-map.height/2)<22;
    },name);
   }
   assert.deepEqual(errors,[]);await page.close();console.log('PASS '+width+'px venue cards centre the corresponding map pins');
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
