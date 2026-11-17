const select=document.querySelector('#campaign-type');
if(select){
 const descriptions={travel:'Destinations, stays and experiences',lifestyle:'Style, beauty and wellbeing',services:'Businesses and professional services',culture:'Exhibitions, performances and events',hospitality:'Restaurants, bars and hospitality',general:'Explore with a broader audience'};
 const field=document.createElement('fieldset');field.className='campaign-choices';
 const legend=document.createElement('legend');legend.textContent='What are you promoting?';field.append(legend);
 const choices=document.createElement('div');choices.className='campaign-choice-list';field.append(choices);
 for(const option of [...select.options].filter(o=>o.value)){
  const button=document.createElement('button');button.type='button';button.dataset.campaignChoice=option.value;button.setAttribute('aria-pressed',String(select.value===option.value));
  const title=document.createElement('strong'),description=document.createElement('span'),mark=document.createElement('i');title.textContent=option.textContent;description.textContent=descriptions[option.value];mark.textContent='↗';mark.setAttribute('aria-hidden','true');button.append(title,description,mark);
  button.addEventListener('click',()=>{select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));choices.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});choices.append(button);
 }
 select.closest('label').before(field);select.closest('label').hidden=true;
}
