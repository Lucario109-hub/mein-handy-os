// 1. LIVE UHRZEIT & DATUM LOGIK
function updateDateTime() {
  const now = new Date();
  
  // Zeit berechnen (Stunden:Minuten)
  let hh = String(now.getHours()).padStart(2, '0');
  let mm = String(now.getMinutes()).padStart(2, '0');
  
  const timeEl = document.getElementById('live-time');
  if (timeEl) {
    timeEl.innerText = hh + ":" + mm;
  }
  
  // Datum berechnen (z. B. Do., 15. Okt.)
  const dateEl = document.getElementById('live-date');
  if (dateEl) {
    const options = { weekday: 'short', day: '2-digit', month: 'short' };
    dateEl.innerText = now.toLocaleDateString('de-DE', options);
  }
}

// Sofort einmal ausführen und dann jede Sekunde aktualisieren
updateDateTime();
setInterval(updateDateTime, 1000);


// 2. LIVE BATTERIE ANZEIGE
if ('getBattery' in navigator) {
  navigator.getBattery().then(battery => {
    function updateBatteryUI() {
      const batEl = document.getElementById('bat-level');
      if (batEl) {
        batEl.style.width = (battery.level * 100) + '%';
      }
    }
    updateBatteryUI();
    battery.addEventListener('levelchange', updateBatteryUI);
  }).catch(err => console.log("Batterie-API nicht geladen:", err));
}


// 3. PWA-INSTALLATIONS-STEUERUNG (ÜBER OPTIONEN-APP)
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  // Standard-Banner von Chrome blockieren
  e.preventDefault();
  // Installations-Event im Speicher merken
  deferredPrompt = e;
  
  // Blauer Leuchteffekt für das Optionen-Zahnrad (Signalisiert: Klick bereit!)
  const optIcon = document.querySelector('.app:nth-child(8) .icon');
  if (optIcon) {
    optIcon.style.boxShadow = "0 0 15px var(--accent-blue)";
  }
});


// 4. WINDOW MANAGER (APPS ÖFFNEN & SCHLIESSEN)
let activeStream = null;

function openApp(id) {
  // Spezialfall: Wenn Optionen geklickt wird UND die App installierbar ist
  if (id === 'options-win' && deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('App-Installation akzeptiert');
      }
      deferredPrompt = null;
    });
    return;
  }

  // Normales App-Fenster einblenden
  const win = document.getElementById(id);
  if (win) {
    win.classList.add('show');
  }
  
  // Wenn die Kamera geöffnet wird, den Videostream starten
  if (id === 'cam-win') {
    startKamera();
  }
}

function closeApp(id) {
  // App-Fenster ausblenden
  const win = document.getElementById(id);
  if (win) {
    win.classList.remove('show');
  }
  
  // Wenn die Kamera geschlossen wird, den Stream stoppen
  if (id === 'cam-win') {
    stopKamera();
  }
}


// 5. NATIVE WEBCAM/KAMERA LOGIK
async function startKamera() {
  const video = document.getElementById('camera-stream');
  const errDiv = document.getElementById('camera-error');
  if (errDiv) {
    errDiv.style.display = "none";
  }

  try {
    activeStream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: "user" }, 
      audio: false 
    });
    if (video) {
      video.srcObject = activeStream;
    }
  } catch (err) {
    console.error("Kamera-Zugriff verweigert:", err);
    if (errDiv) {
      errDiv.style.display = "block";
    }
  }
}

function stopKamera() {
  if (activeStream) {
    activeStream.getTracks().forEach(track => track.stop());
    activeStream = null;
  }
  const video = document.getElementById('camera-stream');
  if (video) {
    video.srcObject = null;
  }
}


// 6. SERVICE WORKER AKTIVIERUNG (OFFLINE-MODUS)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registriert auf:', reg.scope))
      .catch(err => console.error('Service Worker Fehler:', err));
  });
}
