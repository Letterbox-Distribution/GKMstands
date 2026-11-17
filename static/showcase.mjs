// Prefer pre-rendered scroll frames when a generated sequence is available.
// Keep the existing interactive renderer as an automatic fallback.
const fallback=()=>import('./showcase-mainthread.mjs');
const startLive=()=>{
 if('transferControlToOffscreen' in HTMLCanvasElement.prototype&&typeof Worker!=='undefined'&&!location.search.includes('renderer=main')){
  import('./showcase-worker-controller.mjs').then(m=>m.startWorkerShowcase(fallback)).catch(fallback);
 }else fallback();
};
if(location.search.includes('renderer=main')||location.search.includes('renderer=live')){
 startLive();
}else{
 import('./showcase-sequence.mjs').then(m=>m.startSequenceShowcase(startLive)).catch(startLive);
}
