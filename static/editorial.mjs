import {COVER_TITLES} from './stand-layout.mjs';

const gallery=document.getElementById('editorial-covers');
const dialog=document.getElementById('cover-dialog');
if(gallery&&dialog){
 let trigger;
 const title=document.getElementById('cover-dialog-title'),image=document.getElementById('cover-dialog-image'),issue=document.getElementById('cover-dialog-issue');
 gallery.replaceChildren(...COVER_TITLES.map(cover=>{
  const figure=document.createElement('figure'),button=document.createElement('button'),img=document.createElement('img'),caption=document.createElement('figcaption'),name=document.createElement('strong'),date=document.createElement('span');
  button.type='button';button.className='editorial-cover';button.setAttribute('aria-label','Enlarge '+cover.title+' cover, '+cover.issue);
  img.src=cover.src;img.alt=cover.title+' front cover, '+cover.issue;img.loading='lazy';img.decoding='async';img.width=300;img.height=420;
  name.textContent=cover.title;date.textContent=cover.issue;caption.append(name,date);button.append(img);figure.append(button,caption);
  button.onclick=()=>{trigger=button;title.textContent=cover.title;issue.textContent=cover.issue+' · Illustrative editorial selection';image.src=cover.src;image.alt=img.alt;dialog.showModal();};
  return figure;
 }));
 document.getElementById('cover-dialog-close').onclick=()=>dialog.close();
 dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
 dialog.addEventListener('click',event=>{if(event.target===dialog){const bounds=dialog.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)dialog.close();}});
 dialog.addEventListener('close',()=>trigger?.focus({preventScroll:true}));
}
