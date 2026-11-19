// Browser plugin not available; validate the rendered phone layout with Playwright.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  for(const [width,height] of [[320,568],[390,720],[430,844]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto((process.env.BASE_URL||'http://127.0.0.1:5001')+'/showcase');
   await page.waitForFunction(()=>document.body.dataset.entryReady==='true');
   assert.equal(await page.locator('.showcase-mobile-tools').evaluate(e=>e.inert),true);
   await page.evaluate(()=>{const r=document.querySelector('#showcase');scrollTo({top:(r.offsetHeight-r.querySelector('.showcase-stage').offsetHeight)*.91,behavior:'instant'})});
   await page.waitForFunction(()=>document.querySelector('#showcase').dataset.step==='3');
   const layout=await page.evaluate(()=>{
    const rect=s=>document.querySelector(s).getBoundingClientRect();
    return {overflow:document.documentElement.scrollWidth>innerWidth,
     copyBottom:rect('.showcase-chapter[data-chapter="3"] p').bottom,
     toolsTop:rect('.showcase-mobile-tools').top,toolsBottom:rect('.showcase-mobile-tools').bottom,
     navTop:rect('.showcase-bottom').top,
     buttonHeights:[...document.querySelectorAll('[data-pocket]')].map(e=>e.getBoundingClientRect().height),
     logoRight:rect('.header .wordmark').right,ctaLeft:rect('.header .nav-start').left};
   });
   assert.equal(layout.overflow,false);assert(layout.logoRight<layout.ctaLeft);
   assert(layout.copyBottom<layout.toolsTop);assert(layout.toolsBottom<=layout.navTop);
   assert(layout.buttonHeights.every(h=>h>=44));
   await page.locator('[data-pocket="4"]').click();
   await page.waitForFunction(()=>document.querySelector('[data-pocket="4"]').getAttribute('aria-pressed')==='true');
   for(const link of await page.locator('.edition-footer nav a').all())assert(await link.isVisible());
   await page.setViewportSize({width:1440,height:1000});
   await page.waitForFunction(()=>!!document.querySelector('.showcase-chapter[data-chapter="3"] .showcase-tools'));
   assert.equal(await page.locator('#showcase-artwork').count(),1);assert.deepEqual(errors,[]);
   console.log(`Mobile ${width}x${height}: layout, controls, footer and desktop restoration passed`);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
