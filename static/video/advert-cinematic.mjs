// Continuous, muted 18-second editorial advert. Original warm photograph/palette retained.
export const ADVERT_DURATION=18,ADVERT_FPS=30;
let photograph;
export async function prepareAdvert(){if(!photograph){photograph=new Image();photograph.src='/static/environments/hotel-lobby-photo-editorial.webp';await photograph.decode();}return photograph;}
const clamp=n=>Math.max(0,Math.min(1,n)),ease=n=>{n=clamp(n);return n*n*(3-2*n)};
const headlines=[['A place','to pause.'],['A moment','to discover.'],['Your brand.','Beautifully','placed.']];
const captions=[['Considered spaces.','A different kind of first impression.'],['Fashion. Travel. Culture.','Your leaflet, in exceptional company.'],['Premium A5 leaflet placement.','Thoughtfully presented.']];
function message(ctx,index,alpha,offset){if(alpha<.001)return;ctx.save();ctx.globalAlpha=alpha;ctx.translate(0,offset);ctx.fillStyle='#fff7e9';ctx.font='400 83px Georgia, serif';headlines[index].forEach((line,i)=>ctx.fillText(line,56,700+i*92));ctx.fillStyle='#decbb0';ctx.font='400 24px Manrope, sans-serif';captions[index].forEach((line,i)=>ctx.fillText(line,60,(headlines[index].length===3?1010:925)+i*37));ctx.restore();}
export function drawAdvert(ctx,time){
 const w=720,h=1280,t=((time%ADVERT_DURATION)+ADVERT_DURATION)%ADVERT_DURATION,phase=t/ADVERT_DURATION*Math.PI*2;
 ctx.fillStyle='#30251c';ctx.fillRect(0,0,w,h);
 if(photograph){const zoom=1.04+.016*(1-Math.cos(phase))/2,scale=Math.max(w/photograph.width,h/photograph.height)*zoom,dw=photograph.width*scale,dh=photograph.height*scale;ctx.drawImage(photograph,(w-dw)*(.47+.055*Math.sin(phase)),(h-dh)*(.5+.025*Math.sin(phase)),dw,dh);}
 const shade=ctx.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#21170e80');shade.addColorStop(.35,'#21170e33');shade.addColorStop(1,'#21170ed9');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#f7eedf';ctx.font='500 27px Manrope, sans-serif';ctx.fillText('GoldKey',60,84);const divider=60+ctx.measureText('GoldKey').width+16;ctx.strokeStyle='#d6bd95';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(divider,62);ctx.lineTo(divider,88);ctx.stroke();ctx.font='400 27px Manrope, sans-serif';ctx.fillText('Edition',divider+15,84);
 ctx.fillStyle='#d6bd95';ctx.fillRect(60,119,45,2);ctx.font='400 15px Manrope, sans-serif';ctx.fillText('THE ART OF BEING DISCOVERED',60,160);
 const index=Math.floor(t/6),local=t%6,transition=ease((local-4.65)/1.35),outgoing=1-ease(transition/.62),incoming=ease((transition-.38)/.62);
 message(ctx,index,outgoing,-8*transition);message(ctx,(index+1)%3,incoming,10*(1-incoming));
 ctx.strokeStyle='#d4bb9460';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(60,1137);ctx.lineTo(660,1137);ctx.stroke();ctx.fillStyle='#d6bd95';ctx.font='500 15px Manrope, sans-serif';ctx.fillText('PREMIUM A5 LEAFLET PLACEMENTS',60,1184);ctx.fillStyle='#a58b68';ctx.font='400 13px Manrope, sans-serif';ctx.fillText('GOLDKEY EDITION',60,1230);
}
