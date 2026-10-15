// 1. LIVE UHRZEIT & DATUM LOGIK
function updateDateTime() {
  try {
    const now = new Date();
    let hh = String(now.getHours()).padStart(2, '0');
    let mm = String(now.getMinutes()).padStart(2, '0');
    
    const timeEl = document.getElementById('live-time');
    if (timeEl) timeEl.innerText = hh + ":" + mm;
    
    const dateEl = document.getElementById('live-date');
    if (dateEl) {
      const options = { weekday: 'short', day: '2-digit', month: 'short' };
      dateEl.innerText = now.toLocaleDateString('de-DE', options);
    }
  } catch (e) {
    console.error(e);
  }
}
updateDateTime();
setInterval(updateDateTime, 1000);

// 2. LIVE BATTERIE ANZEIGE
if ('getBattery' in navigator) {
  navigator.getBattery().then(battery => {
    function updateBatteryUI() {
      const batEl = document.getElementById('bat-level');
      if (batEl) batEl.style.width = (battery.level * 100) + '%';
    }
    updateBatteryUI();
    battery.addEventListener('levelchange', updateBatteryUI);
  }).catch(err => console.log(err));
}

// 3. PWA-INSTALLATIONS-STEUERUNG
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const optIcon = document.querySelector('.app:nth-child(8) .icon');
  if (optIcon) optIcon.style.boxShadow = "0 0 15px var(--accent-blue)";
});

// 4. WINDOW MANAGER (APPS ÖFFNEN & SCHLIESSEN)
let activeStream = null;

function openApp(id) {
  if (id === 'options-win' && deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
    return;
  }
  const win = document.getElementById(id);
  if (win) win.classList.add('show');
  if (id === 'cam-win') startKamera();
}

function closeApp(id) {
  const win = document.getElementById(id);
  if (win) win.classList.remove('show');
  if (id === 'cam-win') stopKamera();
}

// 5. NATIVE KAMERA LOGIK
async function startKamera() {
  const video = document.getElementById('camera-stream');
  const errDiv = document.getElementById('camera-error');
  if (errDiv) errDiv.style.display = "none";
  try {
    activeStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
    if (video) video.srcObject = activeStream;
  } catch (err) {
    if (errDiv) errDiv.style.display = "block";
  }
}

function stopKamera() {
  if (activeStream) {
    activeStream.getTracks().forEach(track => track.stop());
    activeStream = null;
  }
}

// 6. SERVICE WORKER REGISTRIERUNG
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.error(err));
  });
}

