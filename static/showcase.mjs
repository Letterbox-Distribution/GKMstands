// Only the lightweight DOM controller runs on the scrolling thread.
const fallback=()=>import('./showcase-mainthread.mjs');
if('transferControlToOffscreen' in HTMLCanvasElement.prototype&&typeof Worker!=='undefined'&&!location.search.includes('renderer=main')){
 import('./showcase-worker-controller.mjs').then(m=>m.startWorkerShowcase(fallback)).catch(fallback);
}else fallback();
