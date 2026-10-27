/* Web3Forms key for the Secondsaturday570@gmail.com inbox */
const WEB3FORMS_ACCESS_KEY = "61ca14ed-9437-45c0-aee6-5bdc33e62617";

const $ = id => document.getElementById(id);
if($('year')) $('year').textContent = new Date().getFullYear();

/* ---- mobile menu ---- */
const menuBtn = document.getElementById('menuBtn'), navLinks = document.getElementById('navLinks');
menuBtn.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open);
});
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  navLinks.classList.remove('open'); menuBtn.setAttribute('aria-expanded', false);
}));

/* ---- bulletin (edit bulletin-data.js each month) ---- */
(function renderBulletin(){
  const data = window.SS_BULLETIN;
  const card = document.getElementById('featureCard');
  if(!card) return;
  const inner = () => card.querySelector('.next-in');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const parse = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthsFull = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const ico = {
    clock:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    pin:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    cal:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>'
  };
  const fallback = () => `<p class="eyebrow">Worship nights</p><h3 style="margin-top:22px">Dates coming soon</h3>
    <p class="details" style="margin-top:12px">We meet the second Saturday of most months. Check back here for the next night, or reach out and we'll let you know.</p>`;

  if(!data || !Array.isArray(data.events)){ inner().innerHTML = fallback(); return; }
  if(data.announcement && $('announce')){
    document.getElementById('announce').hidden = false;
    document.getElementById('announceText').textContent = data.announcement;
  }
  const today = new Date(); today.setHours(0,0,0,0);
  const upcoming = data.events.filter(e => e.date && parse(e.date) >= today).sort((a,b) => parse(a.date) - parse(b.date));

  if(!upcoming.length){ inner().innerHTML = fallback(); }
  else {
    const e = upcoming[0], dt = parse(e.date);
    const place = (e.location || '').trim();
    const mapQ = place && !/announced|tbd|tba/i.test(place) ? place.replace(/\s*·\s*/g, ', ') : '';
    inner().innerHTML = `
      <div class="next-top"><p class="eyebrow">Next worship night</p></div>
      <div class="next-date"><span class="day">${dt.getDate()}</span>
        <span class="md">${monthsFull[dt.getMonth()]} ${dt.getFullYear()}<span>${dt.toLocaleDateString('en-US',{weekday:'long'})}</span></span></div>
      <h3>${esc(e.title || 'Worship Night')}</h3>
      <div class="meta">
        ${e.time ? `<div>${ico.clock}<span>${esc(e.time)}</span></div>` : ''}
        ${place ? `<div>${ico.pin}<span>${esc(place)}</span></div>` : ''}
      </div>
      ${e.theme ? `<p class="theme">${esc(e.theme)}</p>` : ''}
      ${e.details ? `<p class="details">${esc(e.details)}</p>` : ''}
      <div class="next-actions">
        <button type="button" class="btn btn-solid" id="featCal">${ico.cal} Add to calendar</button>
        ${mapQ ? `<a class="btn btn-glass" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQ)}" target="_blank" rel="noopener">${ico.pin} Directions</a>` : ''}
        ${e.rsvp ? `<a class="btn btn-glass" href="${esc(e.rsvp)}" target="_blank" rel="noopener">RSVP / details</a>` : ''}
      </div>`;
    document.getElementById('featCal').addEventListener('click', () => downloadICS(e));
  }

  const rest = upcoming.slice(1);
  if(rest.length && $('upcomingBox')){
    document.getElementById('upcomingBox').hidden = false;
    const list = document.getElementById('upcomingList');
    list.innerHTML = rest.map((e,i) => { const dt = parse(e.date); return `<div class="up">
      <div class="up-cal"><div class="m">${months[dt.getMonth()]}</div><div class="n">${dt.getDate()}</div></div>
      <div><b>${esc(e.title || 'Worship Night')}</b><small>${dt.toLocaleDateString('en-US',{weekday:'long'})}${e.time ? ' · ' + esc(e.time) : ''}</small>
      <br><button type="button" class="linkbtn" data-i="${i}">Add to calendar</button></div></div>`; }).join('');
    list.querySelectorAll('.linkbtn').forEach(b => b.addEventListener('click', () => downloadICS(rest[+b.dataset.i])));
  }
  if(Array.isArray(data.notes) && data.notes.length && $('boardBox')){
    document.getElementById('boardBox').hidden = false;
    document.getElementById('boardList').innerHTML = data.notes.map(n => `<li>${esc(n)}</li>`).join('');
  }

  /* .ics calendar file */
  function pad(n){ return String(n).padStart(2,'0'); }
  function icsTime(d){ return d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'T'+pad(d.getHours())+pad(d.getMinutes())+'00'; }
  function parseTime(t){ const m=/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i.exec(t||''); if(!m) return {h:18,mi:0};
    let h=+m[1]; const mi=m[2]?+m[2]:0; const ap=m[3]?m[3].toLowerCase():null;
    if(ap==='pm'&&h<12)h+=12; if(ap==='am'&&h===12)h=0; return {h,mi}; }
  function icsEsc(s){ return String(s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n'); }
  function downloadICS(e){
    const d=parse(e.date), t=parseTime(e.time);
    const start=new Date(d.getFullYear(),d.getMonth(),d.getDate(),t.h,t.mi), end=new Date(start.getTime()+2*3600e3);
    const desc=(e.theme?e.theme+'\n\n':'')+(e.details||'');
    const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Second Saturday//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH',
      'BEGIN:VEVENT','UID:'+e.date+'-secondsaturday@secondsaturdayworship.com','DTSTAMP:'+icsTime(new Date()),
      'DTSTART:'+icsTime(start),'DTEND:'+icsTime(end),'SUMMARY:'+icsEsc(e.title||'Second Saturday Worship Night'),
      e.location?'LOCATION:'+icsEsc(e.location):'', desc.trim()?'DESCRIPTION:'+icsEsc(desc):'',
      'URL:https://secondsaturdayworship.com/','END:VEVENT','END:VCALENDAR'].filter(Boolean).join('\r\n');
    const url=URL.createObjectURL(new Blob([ics],{type:'text/calendar;charset=utf-8'}));
    const a=document.createElement('a'); a.href=url; a.download=(e.title||'second-saturday').replace(/[^a-z0-9]+/gi,'-').toLowerCase()+'.ics';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
})();

/* ---- gallery: show more + lightbox ---- */
(function(){
  const grid = document.getElementById('galleryGrid');
  if(!grid) return;
  const links = [...grid.querySelectorAll('a')], lb = document.getElementById('lightbox');
  const img = lb.querySelector('img'), cap = lb.querySelector('.cap');
  let i = 0, last = null;
  const show = n => { i = (n + links.length) % links.length; const a = links[i], t = a.querySelector('img');
    img.src = a.getAttribute('href'); img.alt = t.alt; cap.textContent = t.alt; };
  const open = n => { last = document.activeElement; show(n); lb.hidden = false; document.body.style.overflow = 'hidden'; lb.querySelector('.x').focus(); };
  const close = () => { lb.hidden = true; document.body.style.overflow = ''; if(last) last.focus(); };
  links.forEach((a, n) => a.addEventListener('click', ev => { ev.preventDefault(); open(n); }));
  lb.querySelector('.x').addEventListener('click', close);
  lb.querySelector('.p').addEventListener('click', () => show(i - 1));
  lb.querySelector('.n').addEventListener('click', () => show(i + 1));
  lb.addEventListener('click', ev => { if(ev.target === lb) close(); });
  document.addEventListener('keydown', ev => { if(lb.hidden) return;
    if(ev.key === 'Escape') close(); if(ev.key === 'ArrowLeft') show(i - 1); if(ev.key === 'ArrowRight') show(i + 1); });
  let x0 = null;
  lb.addEventListener('touchstart', ev => { x0 = ev.touches[0].clientX; }, {passive:true});
  lb.addEventListener('touchend', ev => { if(x0 === null) return; const dx = ev.changedTouches[0].clientX - x0;
    if(Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1)); x0 = null; });
})();

/* ---- copy buttons ---- */
document.querySelectorAll('.copybtn').forEach(b => b.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Copied'; }
  catch(e){ const r = document.createRange(); r.selectNodeContents(b.previousElementSibling); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Selected'; }
  setTimeout(() => b.textContent = 'Copy', 1800);
}));

/* ---- contact form (Web3Forms) ---- */
(function(){
  const form = document.getElementById('contactForm');
  if(!form) return;
  const msg = document.getElementById('formMsg'), btn = document.getElementById('submitBtn');
  document.getElementById('accessKey').value = WEB3FORMS_ACCESS_KEY;
  const say = (cls, text) => { msg.hidden = false; msg.className = cls; msg.textContent = text; };
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    if(!form.checkValidity()){ say('err', 'Please add your name, a valid email, and a message.'); form.reportValidity(); return; }
    btn.disabled = true; btn.textContent = 'Sending…';
    try{
      const res = await fetch('https://api.web3forms.com/submit', {method:'POST', headers:{'Accept':'application/json'}, body:new FormData(form)});
      const json = await res.json();
      if(!json.success) throw new Error(json.message || 'error');
      form.reset(); say('ok', "Thank you! Your message is on its way. We'll be in touch soon.");
    }catch(err){
      say('err', "That didn't send. Please email Secondsaturday570@gmail.com or text 570-317-5520 instead.");
    }finally{ btn.disabled = false; btn.textContent = 'Send message'; }
  });
})();

/* ---- old one-page links (/#gallery etc.) go to the new pages ---- */
(function(){
  const map = {month:'/this-month/', about:'/about/', expect:'/about/#expect', gallery:'/gallery/', believe:'/beliefs/', contact:'/get-involved/'};
  const h = location.hash.slice(1);
  if((location.pathname === '/' || location.pathname === '/index.html') && map[h]) location.replace(map[h]);
})();
