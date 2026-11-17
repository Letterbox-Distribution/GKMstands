// Original 12-second hospitality-style GoldKey creative. Geometry is not part of this asset.
let photograph;
export async function prepareAdvert(){
 if(!photograph){photograph=new Image();photograph.src='/static/environments/hotel-lobby-photo-editorial.webp';await photograph.decode();}
 return photograph;
}
export function drawAdvert(ctx,time){
 const w=720,h=1280,t=((time%12)+12)%12,phase=t*Math.PI/6,scene=Math.floor(t/4),local=t%4;
 const ease=v=>1-Math.pow(1-Math.max(0,Math.min(1,v)),3),alpha=ease(local/.5)*(1-ease((local-3.5)/.5));
 ctx.fillStyle='#30251c';ctx.fillRect(0,0,w,h);
 if(photograph){const scale=Math.max(w/photograph.width,h/photograph.height)*1.04,dw=photograph.width*scale,dh=photograph.height*scale,x=(w-dw)*(.42+.12*Math.sin(phase));ctx.drawImage(photograph,x,(h-dh)/2,dw,dh);}
 const shade=ctx.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#21170e80');shade.addColorStop(.35,'#21170e33');shade.addColorStop(1,'#21170ed9');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#f7eedf';ctx.font='500 27px Manrope, sans-serif';ctx.fillText('GoldKey Select',60,84);
 ctx.fillStyle='#d6bd95';ctx.fillRect(60,119,45,2);ctx.font='400 15px Manrope, sans-serif';ctx.fillText('THE ART OF BEING DISCOVERED',60,160);
 ctx.save();ctx.globalAlpha=alpha;ctx.translate(0,(1-ease(local/.5))*15);
 ctx.fillStyle='#fff7e9';ctx.font='400 83px Georgia, serif';
 const lines=[['A place','to pause.'],['A moment','to discover.'],['Your brand.','Beautifully','placed.']][scene];
 lines.forEach((line,i)=>ctx.fillText(line,56,700+i*92));
 ctx.fillStyle='#decbb0';ctx.font='400 23px Manrope, sans-serif';
 const copy=[['Considered spaces.','A different kind of first impression.'],['Fashion. Travel. Culture.','Your leaflet, in exceptional company.'],['Premium A5 leaflet placement.','Thoughtfully presented.']][scene];
 copy.forEach((line,i)=>ctx.fillText(line,60,lines.length===3?1010+i*37:925+i*37));ctx.restore();
 ctx.strokeStyle='#d4bb9460';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(60,1137);ctx.lineTo(660,1137);ctx.stroke();
 ctx.fillStyle='#d6bd95';ctx.font='500 15px Manrope, sans-serif';ctx.fillText('PREMIUM A5 LEAFLET PLACEMENTS',60,1184);
 ctx.fillStyle='#a58b68';ctx.font='400 13px Manrope, sans-serif';ctx.fillText('GOLDKEY SELECT',60,1230);
 for(let i=0;i<3;i++){ctx.fillStyle=i===scene?'#ddc39b':'#7e6952';ctx.beginPath();ctx.arc(624+i*14,1225,2.5,0,Math.PI*2);ctx.fill();}
}
