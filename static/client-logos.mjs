export const MAGAZINE_LOGOS=[
 {name:'Vogue',file:'vogue.png',style:'vogue'},
 {name:'Harper’s Bazaar',file:'harpers-bazaar.svg',style:'bazaar'},
 {name:'Tatler',file:'tatler.png',style:'tatler'},
 {name:'ELLE',file:'elle.svg',style:'elle'},
 {name:'GQ',file:'gq.png',style:'gq'},
 {name:'Condé Nast Traveller',file:'traveller.svg',style:'traveller'},
 {name:'National Geographic',file:'national-geographic.svg',style:'national-geographic'},
 {name:'Women’s Health',file:'womens-health.svg',style:'womens-health'},
 {name:'Architectural Digest',file:'architectural-digest.png',style:'architectural-digest'},
 {name:'House & Garden',file:'house-and-garden.png',style:'house-and-garden'},
 {name:'The World of Interiors',file:'world-of-interiors.png',style:'world-of-interiors'},
 {name:'ELLE Decoration',file:'elle-decoration.svg',style:'elle-decoration'}
];
const grid=document.getElementById('client-logos');
if(grid)grid.replaceChildren(...MAGAZINE_LOGOS.map(brand=>{
 const item=document.createElement('li'),image=document.createElement('img');
 item.className='client-logo client-logo--'+brand.style;
 image.src='/static/magazine-logos/'+brand.file;image.alt=brand.name;image.loading='lazy';image.decoding='async';
 item.append(image);return item;
}));

if(grid){
 const window=document.createElement('div'),track=document.createElement('div');
 window.className='client-marquee';window.tabIndex=0;window.setAttribute('aria-label','Client logos. Focus to pause scrolling.');
 track.className='client-marquee-track';grid.before(window);window.append(track);track.append(grid);
 const duplicate=grid.cloneNode(true);duplicate.removeAttribute('id');duplicate.setAttribute('aria-hidden','true');track.append(duplicate);
 const observer=new IntersectionObserver(([entry])=>window.classList.toggle('is-offscreen',!entry.isIntersecting));observer.observe(window);
}
