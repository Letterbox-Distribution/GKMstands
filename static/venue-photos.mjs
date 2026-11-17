export function venuePhoto(type=''){
 const kind=/airport/i.test(type)?'airport':/student|university|campus/i.test(type)?'university':/library|cultural|community/i.test(type)?'library':/hotel|lounge/i.test(type)?'hotel':'office';
 const sources={airport:'NaPfgAW3zoE',library:'kmVR1xWdSxs',university:'3yFrdb1fJ98',office:'AgndPU_229s',hotel:'FPS7a7XQZ0w'};
 return {kind,src:'/static/venue-photos/'+kind+'.webp',source:'https://unsplash.com/photos/'+sources[kind]};
}
export function venuePhotoMarkup(type,compact=false){const photo=venuePhoto(type);return `<figure class="venue-photo${compact?' venue-photo--compact':''}"><img src="${photo.src}" alt="Representative ${photo.kind} setting, not the actual venue" width="960" height="600" loading="lazy" decoding="async"><figcaption>Representative setting · Stock photo${compact?'':` <a href="${photo.source}" target="_blank" rel="noopener noreferrer">Photo credit ↗</a>`}</figcaption></figure>`;}
