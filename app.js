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

try {
  const saved = JSON.parse(localStorage.getItem('launcherSettings') || 'null')
  if (saved) settings = {...settings, ...saved}
} catch(e){console.warn(e)}

function applySettings(){
  toggleSounds.checked = !!settings.sounds
  themeSelect.value = settings.theme
  gridSize.value = settings.cols
  document.documentElement.setAttribute('data-theme', settings.theme)
  document.querySelector('.apps-grid').style.gridTemplateColumns = `repeat(${settings.cols}, 1fr)`
}
applySettings()

openSettings?.addEventListener('click', () => { settingsModal.setAttribute('aria-hidden','false') })
closeSettings?.addEventListener('click', () => { settingsModal.setAttribute('aria-hidden','true') })
closeApp?.addEventListener('click', () => { closeAppModal() })

saveSettings?.addEventListener('click', () => {
  settings.sounds = toggleSounds.checked
  settings.theme = themeSelect.value
  settings.cols = parseInt(gridSize.value,10) || 4
  localStorage.setItem('launcherSettings', JSON.stringify(settings))
  applySettings()
  settingsModal.setAttribute('aria-hidden','true')
})

appsGrid?.addEventListener('click', (ev) => {
  let tile = ev.target.closest('.app')
  if (!tile) return
  const name = tile.dataset.app
  if (settings.sounds) { playTap() }
  openApp(name)
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
    case 'photos':
      appContent.innerHTML = `<div style="padding:12px"><div style="width:100%;height:240px;background:linear-gradient(180deg,#222,#111);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#999">Keine Bilder</div></div>`
      break
    case 'music':
      appContent.innerHTML = `<div style="padding:12px">Musik Player — Platzhalter</div>`
      break
    case 'terminal':
      appContent.innerHTML = `<pre style="background:#08111a;color:#4ff;padding:12px;border-radius:8px">$ _</pre>`
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
  appModal.setAttribute('aria-hidden','true')
  appContent.innerHTML = ''
}

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

// playTap: use audio element if src present, otherwise WebAudio beep
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

// keyboard accessibility
window.addEventListener('keydown', (e)=>{
  if (e.key === 'Escape'){
    if (settingsModal.getAttribute('aria-hidden') === 'false') closeSettings?.click()
    if (appModal.getAttribute('aria-hidden') === 'false') closeApp?.click()
  }
})
