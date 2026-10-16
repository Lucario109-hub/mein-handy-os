/* name=app.js */
const appsGrid = document.getElementById('appsGrid')
const settingsModal = document.getElementById('settingsModal')
const openSettings = document.getElementById('open-settings')
const closeSettings = document.getElementById('closeSettings')
const saveSettings = document.getElementById('saveSettings')
const toggleSounds = document.getElementById('toggleSounds')
const themeSelect = document.getElementById('themeSelect')
const gridSize = document.getElementById('gridSize')
const tapSound = document.getElementById('tapSound')
const appModal = document.getElementById('appModal')
const appContent = document.getElementById('appContent')
const closeApp = document.getElementById('closeApp')

let settings = {
  sounds: true,
  theme: 'dark',
  cols: 4
}

// persist/load settings safely
try {
  const saved = JSON.parse(localStorage.getItem('launcherSettings') || 'null')
  if (saved) settings = {...settings, ...saved}
} catch(e){console.warn('Failed to parse settings', e)}

function applySettings(){
  toggleSounds.checked = !!settings.sounds
  themeSelect.value = settings.theme
  gridSize.value = settings.cols
  document.documentElement.setAttribute('data-theme', settings.theme)
  document.querySelector('.apps-grid').style.gridTemplateColumns = `repeat(${settings.cols}, 1fr)`
}
applySettings()

// safe modal open/close helpers with focus management
function openModal(modal){
  modal.setAttribute('aria-hidden','false')
  // focus first focusable inside
  const focusable = modal.querySelector('button, [tabindex], input, textarea, select')
  if (focusable) focusable.focus()
}
function closeModal(modal){
  modal.setAttribute('aria-hidden','true')
  // return focus to grid
  const firstApp = document.querySelector('.app')
  if (firstApp) firstApp.focus()
}

openSettings?.addEventListener('click', () => { openModal(settingsModal) })
closeSettings?.addEventListener('click', () => { closeModal(settingsModal) })
closeApp?.addEventListener('click', () => { closeAppModal() })

saveSettings?.addEventListener('click', () => {
  settings.sounds = toggleSounds.checked
  settings.theme = themeSelect.value
  settings.cols = parseInt(gridSize.value,10) || 4
  localStorage.setItem('launcherSettings', JSON.stringify(settings))
  applySettings()
  closeModal(settingsModal)
})

// keyboard accessibility
window.addEventListener('keydown', (e)=>{
  if (e.key === 'Escape'){
    if (settingsModal.getAttribute('aria-hidden') === 'false') closeModal(settingsModal)
    if (appModal.getAttribute('aria-hidden') === 'false') closeAppModal()
  }
})

// app interaction
appsGrid?.addEventListener('click', (ev) => {
  let tile = ev.target.closest('.app')
  if (!tile) return
  const name = tile.dataset.app
  if (settings.sounds) { playTap() }
  openApp(name)
})
// keyboard activate
appsGrid?.addEventListener('keydown', (ev)=>{
  if (ev.key === 'Enter' || ev.key === ' ') {
    const tile = ev.target.closest('.app')
    if (tile) {
      ev.preventDefault()
      const name = tile.dataset.app
      if (settings.sounds) playTap()
      openApp(name)
    }
  }
})

function openApp(name){
  appModal.setAttribute('aria-hidden','false')
  switch(name){
    case 'browser':
      appContent.innerHTML = `<iframe src="https://lucario109-hub.github.io/mein-handy-os" style="width:100%;height:70vh;border-radius:8px;border:none"></iframe>`
      break
    case 'camera':
      startCamera()
      break
    case 'games':
      appContent.innerHTML = `<div style="padding:24px;font-size:18px">Games Area — Platzhalter</div>`
      break
    case 'chat':
      appContent.innerHTML = `<div style="padding:16px">Chat — Platzhalter</div>`
      break
    case 'music':
      renderMusicPlayer()
      break
    case 'terminal':
      appContent.innerHTML = `<pre style="background:#08111a;color:#4ff;padding:12px;border-radius:8px">$ _</pre>`
      break
    case 'videos':
      appContent.innerHTML = `<div style="padding:12px">Videos — Platzhalter</div>`
      break
    case 'options':
      appContent.innerHTML = `<div style="padding:12px">Optionen — Platzhalter</div>`
      break
    default:
      appContent.innerHTML = `<div style="padding:18px">App ${name}</div>`
  }
}

function closeAppModal(){
  // stop camera if running
  const video = document.querySelector('#appContent video')
  if (video && video.srcObject){
    const tracks = video.srcObject.getTracks()
    tracks.forEach(t=>t.stop())
    video.srcObject = null
  }
  // stop any playing audio we created
  const audio = document.querySelector('#appContent audio')
  if (audio && !audio.paused){ audio.pause(); audio.src = '' }

  appModal.setAttribute('aria-hidden','true')
  appContent.innerHTML = ''
}

// Camera: use getUserMedia if available
async function startCamera(){
  appContent.innerHTML = `<video id="camPreview" autoplay playsinline style="width:100%;height:60vh;border-radius:8px;background:#000"></video>`
  const video = document.getElementById('camPreview')
  try{
    const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}, audio:false})
    video.srcObject = stream
  }catch(e){
    appContent.innerHTML = `<div style="padding:24px;color:#f66">Kamera nicht verfügbar: ${e.message}</div>`
  }
}

/* ---------------- Music Player ---------------- */
function renderMusicPlayer(){
  appContent.innerHTML = `
    <div class="player">
      <div class="player-controls">
        <button id="prevBtn" class="player-btn" aria-label="Vorheriger">⏮</button>
        <button id="playBtn" class="player-btn" aria-label="Play/Pause">▶️</button>
        <button id="nextBtn" class="player-btn" aria-label="Nächster">⏭</button>
        <input id="fileInput" type="file" accept="audio/*" multiple style="margin-left:12px" />
        <button id="clearList" class="player-btn">Clear</button>
      </div>
      <div class="playlist" id="playlist"></div>
    </div>
  `

  initPlayer()
}

let playlist = []
let currentIndex = -1
let audioEl = null

function initPlayer(){
  const fileInput = document.getElementById('fileInput')
  const playBtn = document.getElementById('playBtn')
  const prevBtn = document.getElementById('prevBtn')
  const nextBtn = document.getElementById('nextBtn')
  const playlistEl = document.getElementById('playlist')
  const clearList = document.getElementById('clearList')

  fileInput.addEventListener('change', async (e)=>{
    const files = Array.from(e.target.files || [])
    for(const f of files){
      const url = URL.createObjectURL(f)
      playlist.push({name: f.name, url})
    }
    renderPlaylist()
    if (currentIndex === -1 && playlist.length) playIndex(0)
  })

  playBtn.addEventListener('click', ()=>{
    if (!audioEl){ if (playlist.length) playIndex(0); return }
    if (audioEl.paused) audioEl.play(); else audioEl.pause()
  })
  prevBtn.addEventListener('click', ()=>{ if (playlist.length) playIndex((currentIndex-1+playlist.length)%playlist.length) })
  nextBtn.addEventListener('click', ()=>{ if (playlist.length) playIndex((currentIndex+1)%playlist.length) })
  clearList.addEventListener('click', ()=>{ stopAndClear() })

  function renderPlaylist(){
    playlistEl.innerHTML = ''
    playlist.forEach((item, i)=>{
      const div = document.createElement('div')
      div.className = 'playlist-item'+(i===currentIndex? ' active':'')
      div.innerHTML = `<span style="flex:1">${escapeHtml(item.name)}</span><button data-i="${i}" class="player-btn">Play</button>`
      playlistEl.appendChild(div)
    })
    // attach per-item play buttons
    playlistEl.querySelectorAll('button[data-i]').forEach(btn=>{
      btn.addEventListener('click', (e)=>{ const i = parseInt(e.target.getAttribute('data-i'),10); playIndex(i) })
    })
  }

  function playIndex(i){
    if (i < 0 || i >= playlist.length) return
    currentIndex = i
    // stop old
    if (audioEl){ audioEl.pause(); audioEl.src=''; audioEl.remove(); audioEl=null }
    audioEl = document.createElement('audio')
    audioEl.src = playlist[i].url
    audioEl.controls = true
    audioEl.style.width = '100%'
    audioEl.addEventListener('ended', ()=>{ nextBtn.click() })
    // show audio controls at top
    const existing = document.querySelector('#appContent audio')
    if (existing) existing.remove()
    appContent.prepend(audioEl)
    audioEl.play().catch(()=>{})
    renderPlaylist()
  }

  function stopAndClear(){
    if (audioEl){ audioEl.pause(); audioEl.src=''; audioEl.remove(); audioEl=null }
    playlist.forEach(p=>{ try{ URL.revokeObjectURL(p.url) }catch(e){} })
    playlist = []
    currentIndex = -1
    document.getElementById('playlist').innerHTML = ''
  }

}

function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

/* playTap: use audio element if src present, otherwise WebAudio beep */
function playTap(){
  if (tapSound && tapSound.src){
    tapSound.currentTime = 0; tapSound.play().catch(()=>{})
    return
  }
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = 800
    g.gain.value = 0.0001
    o.connect(g); g.connect(ctx.destination)
    const now = ctx.currentTime
    g.gain.setValueAtTime(0.0001, now)
    g.gain.exponentialRampToValueAtTime(0.2, now + 0.005)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09)
    o.start(now); o.stop(now + 0.12)
    setTimeout(()=>{ try{ ctx.close() }catch(e){} }, 200)
  }catch(e){ /* ignore */ }
}
