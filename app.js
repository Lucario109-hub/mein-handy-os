// app.js - runtime logic for Modern Minimalist OS PWA
// Includes: Clock, Battery, PWA install prompt, Window manager, Camera with gallery (IndexedDB), simple Games (TicTacToe + Memory), Service Worker registration

// --- Utility: simple IndexedDB wrapper for photos ---
const DB_NAME = 'mos-db';
const DB_VERSION = 1;
function openDB(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if(!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

async function addPhoto(dataUrl){
  const db = await openDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction('photos','readwrite');
    const store = tx.objectStore('photos');
    const item = { dataUrl, created: Date.now() };
    const r = store.add(item);
    r.onsuccess = ()=>{ resolve(r.result); db.close(); };
    r.onerror = e=>{ reject(e); db.close(); };
  });
}

async function getAllPhotos(){
  const db = await openDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction('photos','readonly');
    const store = tx.objectStore('photos');
    const r = store.getAll();
    r.onsuccess = ()=>{ resolve(r.result.sort((a,b)=>b.created-a.created)); db.close(); };
    r.onerror = e=>{ reject(e); db.close(); };
  });
}

async function deletePhoto(id){
  const db = await openDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction('photos','readwrite');
    const store = tx.objectStore('photos');
    const r = store.delete(id);
    r.onsuccess = ()=>{ resolve(); db.close(); };
    r.onerror = e=>{ reject(e); db.close(); };
  });
}

// --- 1) Clock & Date ---
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

// --- 2) Battery ---
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

// --- 3) PWA install prompt handling ---
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  deferredPrompt = e;
  const opt = document.querySelector('.app[aria-controls="options-win"] .icon') || document.querySelector('.app:nth-child(8) .icon');
  if(opt) opt.style.boxShadow = '0 0 18px rgba(47,128,237,0.9)';
});

// --- 4) Window manager ---
let activeStream = null;
function openApp(id){
  if(id === 'options-win' && deferredPrompt){
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(()=>{deferredPrompt = null;});
    return;
  }
  const win = document.getElementById(id);
  if(!win) return;
  document.querySelectorAll('.window.show').forEach(w=>{ w.classList.remove('show'); w.setAttribute('aria-hidden','true'); });
  win.classList.add('show');
  win.setAttribute('aria-hidden','false');
  document.querySelectorAll('.app').forEach(btn=>{ const ctrl = btn.getAttribute('aria-controls'); btn.setAttribute('aria-expanded', ctrl===id ? 'true' : 'false'); });
  if(id === 'cam-win') startKamera();
  if(id === 'games-win') initGames();
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

window.addEventListener('keydown', e=>{ if(e.key==='Escape') document.querySelectorAll('.window.show').forEach(w=>{ w.classList.remove('show'); w.setAttribute('aria-hidden','true'); stopKamera(); }); });

// --- 5) Camera + Gallery ---
async function startKamera(){
  const video = document.getElementById('camera-stream');
  const errEl = document.getElementById('camera-error');
  if(errEl) errEl.style.display = 'none';
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ if(errEl) { errEl.style.display='block'; errEl.textContent='Kamera nicht unterstützt.'; } return; }
  try{
    activeStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    if(video){
      if('srcObject' in video) video.srcObject = activeStream; else video.src = URL.createObjectURL(activeStream);
      await video.play().catch(()=>{});
    }
    // load gallery on camera start so user sees recent photos
    await renderGallery();
  }catch(err){ console.warn('camera error', err); if(errEl) { errEl.style.display='block'; errEl.textContent='Kamera-Zugriff verweigert oder nicht verfügbar.';} }
}

function stopKamera(){
  if(activeStream){ activeStream.getTracks().forEach(t=>t.stop()); activeStream = null; }
  const v = document.getElementById('camera-stream'); if(v){ try{ v.pause(); if('srcObject' in v) v.srcObject = null; v.removeAttribute('src'); }catch(e){} }
}

// capture a photo from the video and save to IndexedDB
async function takePhoto(){
  const video = document.getElementById('camera-stream');
  if(!video) return;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  try{
    await addPhoto(dataUrl);
    await renderGallery();
  }catch(e){ console.error('save photo failed', e); }
}

// render gallery thumbnails
async function renderGallery(){
  const container = document.getElementById('gallery');
  const emptyMsg = document.getElementById('gallery-empty');
  if(!container) return;
  container.innerHTML = '';
  try{
    const photos = await getAllPhotos();
    if(!photos || photos.length===0){ if(emptyMsg) emptyMsg.style.display='block'; return; }
    if(emptyMsg) emptyMsg.style.display='none';
    photos.forEach(p=>{
      const btn = document.createElement('button');
      btn.className = 'thumb';
      btn.style.border = 'none';
      btn.style.background = 'transparent';
      btn.style.padding = '0';
      btn.style.cursor = 'pointer';
      const img = document.createElement('img');
      img.src = p.dataUrl;
      img.alt = 'Foto';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '8px';
      btn.appendChild(img);
      btn.addEventListener('click', ()=>openPhotoViewer(p));
      container.appendChild(btn);
    });
  }catch(e){ console.error('render gallery failed', e); }
}

// open photo viewer (fullscreen inside app window)
function openPhotoViewer(photo){
  const viewer = document.getElementById('photo-viewer');
  const img = document.getElementById('photo-viewer-img');
  const del = document.getElementById('photo-delete');
  const dl = document.getElementById('photo-download');
  if(!viewer || !img) return;
  img.src = photo.dataUrl;
  viewer.style.display = 'flex';
  // delete
  del.onclick = async ()=>{
    await deletePhoto(photo.id);
    viewer.style.display = 'none';
    await renderGallery();
  };
  // download
  dl.onclick = ()=>{
    const a = document.createElement('a');
    a.href = photo.dataUrl;
    a.download = `mos-photo-${photo.id}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
}

function closePhotoViewer(){ const viewer = document.getElementById('photo-viewer'); if(viewer) viewer.style.display='none'; }

// --- 6) Games (simple TicTacToe + Memory) ---
let gamesInit = false;
function initGames(){ if(gamesInit) return; gamesInit = true; initTicTacToe(); initMemory(); }

// TicTacToe
function initTicTacToe(){
  const root = document.getElementById('tictactoe');
  if(!root) return;
  root.innerHTML = '';
  const board = document.createElement('div');
  board.style.display='grid';
  board.style.gridTemplateColumns='repeat(3,64px)';
  board.style.gap='6px';
  board.style.marginBottom='8px';
  const state = { cells: Array(9).fill(null), turn: 'X', over:false };
  function render(){
    board.innerHTML='';
    state.cells.forEach((v,i)=>{
      const b = document.createElement('button');
      b.textContent = v||'';
      b.style.width='64px'; b.style.height='64px'; b.style.fontSize='22px';
      b.onclick = ()=>{ if(state.over || state.cells[i]) return; state.cells[i]=state.turn; state.turn = state.turn==='X'?'O':'X'; check(); render(); };
      board.appendChild(b);
    });
  }
  function check(){
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for(const l of lines){ const [a,b,c]=l; if(state.cells[a] && state.cells[a]===state.cells[b] && state.cells[a]===state.cells[c]){ state.over=true; setTimeout(()=>alert('Spiel vorbei: ' + state.cells[a]),0); return; } }
    if(state.cells.every(Boolean)){ state.over=true; setTimeout(()=>alert('Unentschieden'),0); }
  }
  const reset = document.createElement('button'); reset.textContent='Neustart'; reset.onclick=()=>{ state.cells.fill(null); state.turn='X'; state.over=false; render(); };
  root.appendChild(board); root.appendChild(reset); render();
}

// Memory (pairs)
function initMemory(){
  const root = document.getElementById('memory');
  if(!root) return;
  root.innerHTML='';
  const symbols = ['🍎','🍌','🍇','🍒','🍋','🍑'];
  let cards = symbols.concat(symbols).sort(()=>Math.random()-0.5);
  const state = { open: [], matched: [] };
  const grid = document.createElement('div'); grid.style.display='grid'; grid.style.gridTemplateColumns='repeat(4,56px)'; grid.style.gap='6px'; grid.style.marginBottom='8px';
  function render(){ grid.innerHTML=''; cards.forEach((s,i)=>{
    const b = document.createElement('button'); b.style.width='56px'; b.style.height='56px'; b.style.fontSize='22px';
    if(state.matched.includes(i) || state.open.includes(i)) b.textContent = s; else b.textContent = '';
    b.onclick = ()=>{
      if(state.open.includes(i) || state.matched.includes(i)) return;
      state.open.push(i);
      render();
      if(state.open.length===2){ const [a,bIdx]=state.open; if(cards[a]===cards[bIdx]){ state.matched.push(a); state.matched.push(bIdx); state.open = []; setTimeout(()=>render(),300); } else { setTimeout(()=>{ state.open=[]; render(); },600); } }
    };
    grid.appendChild(b);
  }); }
  const reset = document.createElement('button'); reset.textContent='Neustart'; reset.onclick=()=>{ cards = symbols.concat(symbols).sort(()=>Math.random()-0.5); state.open=[]; state.matched=[]; render(); };
  root.appendChild(grid); root.appendChild(reset); render();
}

// --- 7) Service worker registration ---
if('serviceWorker' in navigator){ window.addEventListener('load', ()=>{ navigator.serviceWorker.register('./sw.js').then(r=>console.log('SW registered',r.scope)).catch(e=>console.warn('SW failed', e)); }); }

// expose some functions to the window so HTML buttons can call them
window.openApp = openApp;
window.closeApp = closeApp;
window.takePhoto = takePhoto;
window.closePhotoViewer = closePhotoViewer;

// initial gallery render in case camera not opened
document.addEventListener('DOMContentLoaded', ()=>{ renderGallery().catch(()=>{}); });
