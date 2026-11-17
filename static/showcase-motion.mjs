// One uninterrupted camera path, shared by the live renderer and frame capture.
const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=value=>{const t=clamp(value);return t*t*t*(t*(t*6-15)+10);};
const maximumFocus=smooth((.78-.34)/(.92-.34));
export function showcaseMotion(progress){
 const p=clamp(progress);
 return {
  studio:smooth((p-.32)/(.49-.32)),
  arc:p,
  turn:-.15*p,
  angle:.16+.09*p,
  // Ease into the approved maximum size; the orbit continues after zoom settles.
  focus:maximumFocus*smooth(p/.78),
 };
}
