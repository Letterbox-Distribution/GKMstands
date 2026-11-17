const ns='http://www.w3.org/2000/svg';
export function createProjectedEditionGlow(host){
 const svg=document.createElementNS(ns,'svg');svg.classList.add('edition-glow');svg.setAttribute('aria-hidden','true');svg.setAttribute('hidden','');
 svg.innerHTML='<g class="edition-glow-pulse"><polygon class="edition-glow-edge"/></g>';host.append(svg);
 return {remove:()=>svg.remove(),update(points,opacity,width,height){svg.toggleAttribute('hidden',!points||opacity<.001);if(!points)return;svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.style.opacity=String(opacity);const cx=points.reduce((sum,p)=>sum+p[0],0)/4,cy=points.reduce((sum,p)=>sum+p[1],0)/4;const value=points.map(([x,y])=>[x+Math.sign(x-cx)*2,y+Math.sign(y-cy)*2].map(n=>n.toFixed(2)).join(',')).join(' ');svg.querySelectorAll('polygon').forEach(p=>p.setAttribute('points',value));}};
}
