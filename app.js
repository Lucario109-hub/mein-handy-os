/* app.js revamp with games (Snake + TicTacToe), cleanup and scrolling support */

const BRANCH = 'revamp/all'

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

// Settings: schema + migration
const SETTINGS_KEY = 'launcherSettings_v2'
let settings = { sounds: true, theme: 'dark', cols: 4, schema: 2 }

function loadSettings(){
  try{
    const rawV1 = localStorage.getItem('launcherSettings')
    if (rawV1 && !localStorage.getItem(SETTINGS_KEY)){
      try{ const v1 = JSON.parse(rawV1); const migrated = {...settings, ...v1, schema:2}; localStorage.setItem(SETTINGS_KEY, JSON.stringify(migrated)) }catch(e){}
    }
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) settings = {...settings, ...JSON.parse(raw)}
  }catch(e){ console.warn('settings load failed', e) }
}
loadSettings()

function saveSettingsStorage(){
  try{ localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)) }catch(e){ console.warn('save failed', e) }
}

function applySettings(){
  toggleSounds.checked = !!settings.sounds
  themeSelect.value = settings.theme
  gridSize.value = settings.cols
  document.documentElement.setAttribute('data-theme', settings.theme)
  document.querySelector('.apps-grid').style.gridTemplateColumns = `repeat(${settings.cols}, 1fr)`
}
applySettings()

// persistent audio context for tap sound to avoid creating many contexts
let audioCtx = null
function ensureAudioCtx(){
  if (!audioCtx){
    try{ audioCtx = new (window.AudioContext || window.webkitAudioContext)() }catch(e){ audioCtx = null }
  }
  return audioCtx
}

function playTap(){
  if (tapSound && tapSound.src){
    tapSound.currentTime = 0; tapSound.play().catch(()=>{})
    return
  }
  const ctx = ensureAudioCtx()
  if (!ctx) return
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
}

// modal helpers with focus management and cleanup
function trapFocus(modal){
  const focusable = modal.querySelectorAll('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])')
  const first = focusable[0]
  const last = focusable[focusable.length-1]
  function handle(e){
    if (e.key !== 'Tab') return
    if (e.shiftKey){ if (document.activeElement === first){ e.preventDefault(); last.focus() } }
    else { if (document.activeElement === last){ e.preventDefault(); first.focus() } }
  }
  modal.__focusHandler = handle
  modal.addEventListener('keydown', handle)
}
function releaseFocus(modal){ if (modal.__focusHandler) modal.removeEventListener('keydown', modal.__focusHandler); modal.__focusHandler = null }

function openModal(modal){
  modal.setAttribute('aria-hidden','false')
  trapFocus(modal)
  const focusable = modal.querySelector('button, [tabindex], input, textarea, select')
  if (focusable) focusable.focus()
}
function closeModal(modal){
  releaseFocus(modal)
  modal.setAttribute('aria-hidden','true')
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
  saveSettingsStorage()
  applySettings()
  closeModal(settingsModal)
})

// keyboard accessibility for grid
window.addEventListener('keydown', (e)=>{
  if (e.key === 'Escape'){
    if (settingsModal.getAttribute('aria-hidden') === 'false') closeModal(settingsModal)
    if (appModal.getAttribute('aria-hidden') === 'false') closeAppModal()
  }
})

// app interactions
appsGrid?.addEventListener('click', (ev) => {
  let tile = ev.target.closest('.app')
  if (!tile || tile.classList.contains('placeholder')) return
  const name = tile.dataset.app
  if (settings.sounds) { playTap() }
  openApp(name)
})
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

// resource helpers
function stopTracksFromElement(el){
  if (!el) return
  const stream = el.srcObject
  if (stream && stream.getTracks){ stream.getTracks().forEach(t=>{ try{ t.stop() }catch(e){} })
    try{ el.srcObject = null }catch(e){}
  }
}
function removeIframeAndRevoke(iframe){
  try{
    if (!iframe) return
    iframe.removeAttribute('src')
    iframe.remove()
  }catch(e){ console.warn(e) }
}

function openApp(name){
  clearAppContent()
  openModal(appModal)
  switch(name){
    case 'browser':
      const ifr = document.createElement('iframe')
      ifr.src = 'https://lucario109-hub.github.io/mein-handy-os'
      ifr.style.width = '100%'
      ifr.style.height = '70vh'
      ifr.style.border = 'none'
      ifr.setAttribute('sandbox','allow-same-origin allow-scripts')
      ifr.loading = 'lazy'
      appContent.appendChild(ifr)
      break
    case 'camera':
      startCamera()
      break
    case 'games':
      renderGamesMenu()
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

function clearAppContent(){
  const video = appContent.querySelector('video')
  if (video) stopTracksFromElement(video)
  const auds = appContent.querySelectorAll('audio')
  auds.forEach(a=>{ try{ a.pause(); a.src = ''; a.remove() }catch(e){} })
  const iframes = appContent.querySelectorAll('iframe')
  iframes.forEach(ifr=>removeIframeAndRevoke(ifr))
  // stop games if running
  stopSnake()
  stopTicTacToe()
  appContent.innerHTML = ''
}

function closeAppModal(){
  clearAppContent()
  closeModal(appModal)
}

async function startCamera(){
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    appContent.innerHTML = `<div style="padding:24px;color:#f66">Kamera nicht unterstützt in diesem Browser.</div>`
    return
  }
  appContent.innerHTML = `<video id="camPreview" autoplay playsinline style="width:100%;height:60vh;border-radius:8px;background:#000"></video>`
  const video = document.getElementById('camPreview')
  try{
    const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}, audio:false})
    video.srcObject = stream
  }catch(e){
    appContent.innerHTML = `<div style="padding:24px;color:#f66">Kamera nicht verfügbar: ${e.message}</div>`
  }
}

/* ---------------- Music Player (refactor) ---------------- */
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
    playlistEl.querySelectorAll('button[data-i]').forEach(btn=>{
      btn.addEventListener('click', (e)=>{ const i = parseInt(e.target.getAttribute('data-i'),10); playIndex(i) })
    })
  }

  function playIndex(i){
    if (i < 0 || i >= playlist.length) return
    currentIndex = i
    if (audioEl){ audioEl.pause(); audioEl.src=''; audioEl.remove(); audioEl=null }
    audioEl = document.createElement('audio')
    audioEl.src = playlist[i].url
    audioEl.controls = true
    audioEl.style.width = '100%'
    audioEl.addEventListener('ended', ()=>{ nextBtn.click() })
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

/* ---------------- Games: Menu + Snake + TicTacToe ---------------- */
function renderGamesMenu(){
  appContent.innerHTML = `
    <div style="padding:12px">
      <h3 style="margin-top:0">Games</h3>
      <div class="game-menu">
        <button id="launchSnake" class="game-btn">Snake</button>
        <button id="launchTic" class="game-btn">Tic Tac Toe</button>
      </div>
    </div>
  `
  document.getElementById('launchSnake').addEventListener('click', renderSnake)
  document.getElementById('launchTic').addEventListener('click', renderTicTacToe)
}

/* ----- Snake ----- */
let snakeLoop = null
let snakeState = null

function renderSnake(){
  clearAppContent()
  openModal(appModal) // ensure modal stays open (already open)
  appContent.innerHTML = `
    <div style="padding:12px">
      <h3>Snake</h3>
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:8px">
        <button id="snakeStart" class="player-btn">Start</button>
        <button id="snakeStop" class="player-btn">Stop</button>
        <div id="snakeScore" style="color:var(--muted)">Score: 0</div>
      </div>
      <canvas id="snakeCanvas" width="300" height="300" style="background:#000;border-radius:8px;display:block;margin:auto"></canvas>
      <div style="margin-top:8px;color:var(--muted);font-size:13px">Steuerung: Pfeiltasten oder W/A/S/D</div>
    </div>
  `

  const canvas = document.getElementById('snakeCanvas')
  const ctx = canvas.getContext('2d')
  const grid = 15
  const cols = Math.floor(canvas.width / grid)
  const rows = Math.floor(canvas.height / grid)

  function init(){
    snakeState = {dir: {x:1,y:0}, body:[{x:2,y:Math.floor(rows/2)}], food: {}, score:0, speed:120}
    placeFood()
    draw()
  }
  function placeFood(){
    snakeState.food = {x: Math.floor(Math.random()*cols), y: Math.floor(Math.random()*rows)}
  }
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height)
    // food
    ctx.fillStyle = '#f44'
    ctx.fillRect(snakeState.food.x*grid, snakeState.food.y*grid, grid, grid)
    // snake
    ctx.fillStyle = '#6ef2a1'
    snakeState.body.forEach((p, i)=>{ ctx.fillRect(p.x*grid, p.y*grid, grid-1, grid-1) })
  }
  function step(){
    const head = {...snakeState.body[snakeState.body.length-1]}
    head.x += snakeState.dir.x
    head.y += snakeState.dir.y
    // wrap
    if (head.x < 0) head.x = cols-1
    if (head.x >= cols) head.x = 0
    if (head.y < 0) head.y = rows-1
    if (head.y >= rows) head.y = 0
    // collision
    if (snakeState.body.some(s=>s.x===head.x && s.y===head.y)){
      // game over
      stopSnake()
      alert('Game Over — Score: '+snakeState.score)
      return
    }
    snakeState.body.push(head)
    if (head.x === snakeState.food.x && head.y === snakeState.food.y){
      snakeState.score += 1
      document.getElementById('snakeScore').textContent = 'Score: '+snakeState.score
      placeFood()
    }else{
      snakeState.body.shift()
    }
    draw()
  }

  function startSnake(){
    stopSnake()
    snakeLoop = setInterval(step, snakeState.speed)
  }
  function stopSnake(){
    if (snakeLoop) clearInterval(snakeLoop)
    snakeLoop = null
  }

  function onKey(e){
    const k = e.key
    if (k === 'ArrowUp' || k.toLowerCase()==='w'){ if (snakeState.dir.y === 0){ snakeState.dir = {x:0,y:-1} } }
    if (k === 'ArrowDown' || k.toLowerCase()==='s'){ if (snakeState.dir.y === 0){ snakeState.dir = {x:0,y:1} } }
    if (k === 'ArrowLeft' || k.toLowerCase()==='a'){ if (snakeState.dir.x === 0){ snakeState.dir = {x:-1,y:0} } }
    if (k === 'ArrowRight' || k.toLowerCase()==='d'){ if (snakeState.dir.x === 0){ snakeState.dir = {x:1,y:0} } }
  }

  init()
  document.getElementById('snakeStart').addEventListener('click', ()=>{ startSnake() })
  document.getElementById('snakeStop').addEventListener('click', ()=>{ stopSnake() })
  window.addEventListener('keydown', onKey)

  // store cleanup function
  snakeCleanup = ()=>{ stopSnake(); window.removeEventListener('keydown', onKey) }
}

let snakeCleanup = null
function stopSnake(){ if (snakeCleanup) { try{ snakeCleanup() }catch(e){}; snakeCleanup = null } }

/* ----- Tic Tac Toe ----- */
let ticCleanup = null
function renderTicTacToe(){
  clearAppContent()
  openModal(appModal)
  appContent.innerHTML = `
    <div style="padding:12px">
      <h3>Tic Tac Toe</h3>
      <div id="tttBoard" style="display:grid;grid-template-columns:repeat(3,96px);gap:6px;justify-content:center;margin-top:12px"></div>
      <div style="margin-top:10px;color:var(--muted)" id="tttStatus">X's turn</div>
      <div style="margin-top:10px"><button id="tttReset" class="player-btn">Reset</button></div>
    </div>
  `
  const boardEl = document.getElementById('tttBoard')
  const statusEl = document.getElementById('tttStatus')
  const resetBtn = document.getElementById('tttReset')
  let board = Array(9).fill(null)
  let turn = 'X'

  function renderBoard(){
    boardEl.innerHTML = ''
    board.forEach((v,i)=>{
      const btn = document.createElement('button')
      btn.className = 'player-btn'
      btn.style.width = '96px'; btn.style.height='96px'; btn.style.fontSize='36px'
      btn.textContent = v || ''
      btn.addEventListener('click', ()=>{ if (!board[i]){ board[i]=turn; if (checkWinner()) return; turn = (turn==='X')?'O':'X'; statusEl.textContent = turn+"'s turn"; renderBoard() } })
      boardEl.appendChild(btn)
    })
  }
  function checkWinner(){
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
    for(const l of lines){ const [a,b,c]=l; if (board[a] && board[a]===board[b] && board[b]===board[c]){ statusEl.textContent = board[a]+' wins!'; return true } }
    if (board.every(Boolean)){ statusEl.textContent = 'Draw'; return true }
    return false
  }
  resetBtn.addEventListener('click', ()=>{ board = Array(9).fill(null); turn='X'; statusEl.textContent = "X's turn"; renderBoard() })
  renderBoard()

  ticCleanup = ()=>{ /* nothing heavy here */ ticCleanup = null }
}
function stopTicTacToe(){ if (ticCleanup) { try{ ticCleanup() }catch(e){}; ticCleanup = null } }

/* ---------------- Battery UI ---------------- */
async function initBattery(){
  const levelEl = document.getElementById('batteryLevel')
  const batteryWrap = document.getElementById('battery')
  const chargingEl = document.getElementById('batteryCharging')
  const clockEl = document.getElementById('statusClock')
  const percentEl = document.getElementById('batteryPercent')

  function setClock(){ const d = new Date(); const m = d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); if (clockEl) clockEl.textContent = m }
  setClock(); setInterval(setClock, 60*1000)

  if (!navigator.getBattery){ if (levelEl) levelEl.style.width = '77%'; if (percentEl) percentEl.textContent = '77%'; return }
  try{
    const b = await navigator.getBattery()
    function update(){ const pct = Math.round(b.level * 100); if (levelEl) levelEl.style.width = Math.max(2,pct)+'%'; if (percentEl) percentEl.textContent = pct+'%'; if (b.charging){ batteryWrap.classList.add('charging'); chargingEl.style.opacity = 1 } else { batteryWrap.classList.remove('charging'); chargingEl.style.opacity = 0 } }
    update()
    b.addEventListener('levelchange', update)
    b.addEventListener('chargingchange', update)
  }catch(e){ console.warn('Battery API failed', e); if (levelEl) levelEl.style.width='77%'; if (percentEl) percentEl.textContent='77%' }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBattery)
else initBattery()

// ensure cleanup when navigating away
window.addEventListener('beforeunload', ()=>{
  try{ if (audioCtx && audioCtx.state !== 'closed') audioCtx.close() }catch(e){}
  try{ playlist.forEach(p=>{ URL.revokeObjectURL(p.url) }) }catch(e){}
})
