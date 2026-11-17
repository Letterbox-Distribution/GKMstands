export const A4={width:.210,height:.297};
export const A5={width:.148,height:.210};
export const EDITABLE_SLOTS=['top','middle','bottom'].flatMap(shelf=>[2,3].map(holder=>({shelf,holder})));
export const validFacing=f=>EDITABLE_SLOTS.some(s=>s.shelf===f?.shelf&&s.holder===f.holder);
export const facingForSlot=slot=>({shelf:slot.shelf,holder:slot.side==='right'?3:2});
const COVERS=[
 {title:'Vogue',issue:'December 2026',shelf:'top',holder:0,file:'vogue',source:'https://www.vogue.co.uk/article/editors-letter-british-vogue-december-2026'},
 {title:'Harper’s Bazaar',issue:'November 2026',shelf:'middle',holder:0,file:'bazaar',source:'https://www.harpersbazaar.com/uk/culture/a74056269/lydia-slater-editors-letter-november-2026/'},
 {title:'Tatler',issue:'December 2026',shelf:'bottom',holder:0,file:'tatler',source:'https://www.tatler.com/article/henry-pollock-interview'},
 {title:'ELLE',issue:'March 2026',shelf:'top',holder:5,file:'elle',source:'https://gb.readly.com/magazines/elle-uk/2026-02-05'},
 {title:'GQ',issue:'November 2026',shelf:'middle',holder:5,file:'gq',source:'https://covers.condenast.co.uk/api/v1/gq/2026/11/image/print/1000/'},
 {title:'Condé Nast Traveller',issue:'December 2026',shelf:'bottom',holder:5,file:'cntraveller',source:'https://covers.condenast.co.uk/api/v1/tr/2026/12/image/print/1000/'}
].map(m=>({...m,src:'/static/magazines/'+m.file+'-2026.'+(m.file==='elle'?'webp':'jpg')}));

// Two A4 columns on either side of two A5 columns. Dimensions in metres.
export const COLUMN_WIDTHS=[A4.width,A4.width,A5.width,A5.width,A4.width,A4.width];
export const COLUMN_GAP=.012;
export const PAPER_SPAN=COLUMN_WIDTHS.reduce((a,b)=>a+b,0)+COLUMN_GAP*5;
export const columnX=i=>-PAPER_SPAN/2+COLUMN_WIDTHS.slice(0,i).reduce((a,b)=>a+b+COLUMN_GAP,0)+COLUMN_WIDTHS[i]/2;
// Each side shows all six titles; repeat the cover set across the two sides.
const companionCover=[5,3,4,1,2,0];
export const MAGAZINES=COVERS.flatMap((m,i)=>[m,{...COVERS[companionCover[i]],shelf:m.shelf,holder:m.holder===0?1:4}]);
export const COVER_TITLES=COVERS;
