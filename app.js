// app.js - runtime logic for Modern Minimalist OS PWA
// 1) Clock & Date
function updateDateTime(){
  try{
    const now = new Date();
    const timeEl = document.getElementById('live-time');
    const dateEl = document.getElementById('live-date');
    if(timeEl) timeEl.textContent = now.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
    if(dateEl) dateEl.textContent = now.toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'short'});
  }catch(e){console.error(e)}
}
updateDateTime();
setInterval(updateDateTime, 60_000);

// 2) Battery progress (progressive enhancement)
async function initBattery(){
  try{
    if('getBattery' in navigator){
      const b = await navigator.getBattery();
      const update = ()=>{
        const lvl = Math.round(b.level*100);
        const el = document.getElementById('bat-level');
        const txt = document.getElementById('bat-percent') || document.querySelector('.battery span');
        if(el) el.style.width = lvl + '%';
        if(txt) txt.textContent = lvl + '%';
        if(el) el.style.background = lvl<=20 ? '#ff3b30' : (lvl<=50 ? '#ff9f0a' : '#30d158');
      };
      update();
      b.addEventListener('levelchange', update);
      b.addEventListener('chargingchange', update);
    }
  }catch(e){console.warn('Battery init failed',e)}
}
initBattery();

// 3) PWA install prompt handling
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  deferredPrompt = e;
  // visual hint: highlight options icon if present
  const opt = document.querySelector('.app[aria-controls="options-win"] .icon') || document.querySelector('.app:nth-child(8) .icon');
  if(opt) opt.style.boxShadow = '0 0 18px rgba(47,128,237,0.9)';
});

// 4) Window manager (open/close apps)
let activeStream = null;
function openApp(id){
  if(id === 'options-win' && deferredPrompt){
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(()=>{deferredPrompt = null;});
    return;
  }
  const win = document.getElementById(id);
  if(!win) return;
  // close others
  document.querySelectorAll('.window.show').forEach(w=>{ w.classList.remove('show'); w.setAttribute('aria-hidden','true'); });
  win.classList.add('show');
  win.setAttribute('aria-hidden','false');
  // update aria-expanded on buttons
  document.querySelectorAll('.app').forEach(btn=>{ const ctrl = btn.getAttribute('aria-controls'); btn.setAttribute('aria-expanded', ctrl===id ? 'true' : 'false'); });
  if(id === 'cam-win') startKamera();
}

function closeApp(id){
  const win = document.getElementById(id);
  if(!win) return;
  win.classList.remove('show');
  win.setAttribute('aria-hidden','true');
  document.querySelectorAll('.app[aria-controls="'+id+'"]')
    .forEach(btn=>btn.setAttribute('aria-expanded','false'));
  if(id === 'cam-win') stopKamera();
}

// allow closing via Escape
window.addEventListener('keydown', e=>{ if(e.key==='Escape') document.querySelectorAll('.window.show').forEach(w=>{ w.classList.remove('show'); w.setAttribute('aria-hidden','true'); stopKamera(); document.querySelectorAll('.app').forEach(b=>b.setAttribute('aria-expanded','false')); }); });

// 5) Camera handling
async function startKamera(){
  const video = document.getElementById('camera-stream');
  const errEl = document.getElementById('camera-error');
  if(errEl) errEl.style.display = 'none';
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ if(errEl) { errEl.style.display='block'; errEl.textContent='Kamera nicht unterstützt.'; } return; }
  try{
    activeStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    if('srcObject' in video) video.srcObject = activeStream; else video.src = URL.createObjectURL(activeStream);
    await video.play().catch(()=>{});
  }catch(err){ console.warn('camera error', err); if(errEl) { errEl.style.display='block'; errEl.textContent='Kamera-Zugriff verweigert oder nicht verfügbar.';} }
}
function stopKamera(){ if(activeStream){ activeStream.getTracks().forEach(t=>t.stop()); activeStream = null; } const v = document.getElementById('camera-stream'); if(v){ try{ v.pause(); v.srcObject = null; }catch(e){} } }
window.addEventListener('pagehide', stopKamera); window.addEventListener('beforeunload', stopKamera);

// 6) Service worker registration
if('serviceWorker' in navigator){ window.addEventListener('load', ()=>{ navigator.serviceWorker.register('./sw.js').then(r=>console.log('SW registered',r.scope)).catch(e=>console.warn('SW failed',e)); }); }
