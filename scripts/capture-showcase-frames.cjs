/* Deterministic capture of the same worker/model used by the interactive hero. */
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const base=process.env.BASE_URL||'http://127.0.0.1:5001';
const count=Number(process.env.SEQUENCE_FRAMES||181);
if(!Number.isInteger(count)||count<2)throw Error('SEQUENCE_FRAMES must be an integer of at least 2');
const versioned=spawnSync(process.execPath,['scripts/build-asset-versions.cjs'],{stdio:'inherit'});if(versioned.status!==0)throw Error('Media fingerprint build failed');
const sourceFiles=['showcase-render.worker.mjs','stand-reference.mjs','stand-layout.mjs','showcase-setting.mjs','showcase-venues.mjs','cached-lighting.mjs','asset-url.mjs'];
const revision=crypto.createHash('sha256').update(sourceFiles.map(name=>fs.readFileSync('static/'+name)).join('')+fs.readFileSync('scripts/build-showcase-sequence.py','utf8')+'|'+count+'|2x-v2-mobile912').digest('hex').slice(0,12);
const output=path.resolve('static/showcase-sequence',revision);
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  for(const spec of [{name:'desktop',width:1440,height:910},{name:'mobile',width:390,height:912}].filter(spec=>!process.env.SEQUENCE_VARIANT||spec.name===process.env.SEQUENCE_VARIANT)){
   const folder=path.join(output,spec.name);fs.mkdirSync(folder,{recursive:true});
   const page=await browser.newPage();await page.goto(base+'/static/showcase.mjs');
   await page.evaluate(async spec=>{
    window.captureWorker=new Worker('/static/showcase-render.worker.mjs',{type:'module'});
    window.capturePending=new Map();window.captureWorker.onerror=error=>window.captureError(Error(error.message));window.captureWorker.onmessage=({data})=>{
     if(data.type==='ready')window.captureReady();
     if(data.type==='error')window.captureError(Error(data.message));
     if(data.type==='captured'){window.capturePending.get(data.id)?.(data);window.capturePending.delete(data.id);}
    };
    await new Promise((resolve,reject)=>{window.captureReady=resolve;window.captureError=reject;const canvas=new OffscreenCanvas(spec.width*2,spec.height*2);captureWorker.postMessage({type:'init',canvas,width:spec.width,height:spec.height,pixelRatio:2,capture:true},[canvas]);});
   },spec);
   const frames=[];
   for(let index=0;index<count;index++){
    const file=String(index).padStart(4,'0')+'.webp',progress=index/(count-1);
    const data=await page.evaluate(async({index,progress})=>{
     const result=await new Promise(resolve=>{capturePending.set(index,resolve);captureWorker.postMessage({type:'capture',id:index,progress});});
     const bytes=new Uint8Array(result.bytes);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
     return {metadata:result.metadata,base64:btoa(binary)};
    },{index,progress});
    fs.writeFileSync(path.join(folder,file),Buffer.from(data.base64,'base64'));
    const {screenCorners,clip,camera,zoom,studio,leaflets}=data.metadata;
    frames.push({file,progress,screenCorners,clip,camera,zoom,studio,leaflets});
    if(index%30===0)console.log(spec.name,index+'/'+count);
   }
   fs.writeFileSync(path.join(folder,'capture.json'),JSON.stringify({...spec,count,frames}));
   await page.close();
  }
 }finally{await browser.close();}
 const python=process.env.PYTHON||(process.platform==='win32'?'py':'python3');
 const args=[...(process.platform==='win32'&&!process.env.PYTHON?['-3']:[]),'scripts/build-showcase-sequence.py',output];
 const result=spawnSync(python,args,{stdio:'inherit'});
 if(result.status!==0)throw Error('Sequence validation/encoding failed');
 console.log('BUILT sequence',revision);
})().catch(error=>{console.error(error);process.exitCode=1});
