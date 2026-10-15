  <script>
    // 1. LIVE UHRZEIT & DATUM LOGIK
    function updateDateTime() {
      const now = new Date();
      let hh = String(now.getHours()).padStart(2, '0');
      let mm = String(now.getMinutes()).padStart(2, '0');
      const timeEl = document.getElementById('live-time');
      if(timeEl) timeEl.innerText = `${hh}:${mm}`;
      
      const dateEl = document.getElementById('live-date');
      if(dateEl) {
        const options = { weekday: 'short', day: '2-digit', month: 'short' };
        dateEl.innerText = now.toLocaleDateString('de-DE', options);
      }
    }
    setInterval(updateDateTime, 1000);
    updateDateTime();

    // 2. LIVE BATTERIE LOGIK
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        function updateBatteryUI() {
          const batEl = document.getElementById('bat-level');
          if(batEl) batEl.style.width = (battery.level * 100) + '%';
        }
        updateBatteryUI();
        battery.addEventListener('levelchange', updateBatteryUI);
      });
    }

    // 3. ERZWUNGENE PWA-INSTALLATION ÜBER DIE "OPTIONEN"-APP
    let deferredPrompt;
    
    // Chrome-Installations-Event abfangen
    window.addEventListener('beforeinstallprompt', (e) => {
      // Verhindert, dass Chrome das Standard-Banner zeigt
      e.preventDefault();
      // Speichert das Event für später
      deferredPrompt = e;
      
      // Macht die Optionen-App visuell aufmerksam (z.B. blauer Schein), dass sie klickbar ist
      const optionenApp = document.querySelector('.app:nth-child(8) .icon');
      if(optionenApp) {
        optionenApp.style.boxShadow = "0 0 15px var(--accent-blue)";
      }
    });

    // Diese Funktion wird aufgerufen, wenn du auf die Optionen-App tippst
    function openApp(id) {
      // Wenn der Nutzer auf Optionen klickt UND die App installierbar ist
      if (id === 'options-win' && deferredPrompt) {
        deferredPrompt.prompt(); // Zeigt das echte Chrome-Installationsfenster an
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('Nutzer hat die Installation akzeptiert');
          }
          deferredPrompt = null;
        });
        return; // Öffnet das normale Fenster nicht, da die Installation triggert
      }

      // Normaler Window-Manager für die anderen Apps
      const win = document.getElementById(id);
      if(win) win.classList.add('show');
      if (id === 'cam-win') startKamera();
    }

    function closeApp(id) {
      const win = document.getElementById(id);
      if(win) win.classList.remove('show');
      if (id === 'cam-win') stopKamera();
    }

    // 4. KAMERA STREAM LOGIK (WebRTC)
    let activeStream = null;
    async function startKamera() {
      const video = document.getElementById('camera-stream');
      const errDiv = document.getElementById('camera-error');
      try {
        activeStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if(video) video.srcObject = activeStream;
      } catch (err) {
        if(errDiv) errDiv.style.display = "block";
      }
    }
    function stopKamera() {
      if (activeStream) { activeStream.getTracks().forEach(track => track.stop()); activeStream = null; }
    }

    // 5. SERVICE WORKER REGISTRIERUNG
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('Service Worker aktiv: ', reg.scope))
          .catch(err => console.error('Service Worker Fehler: ', err));
      });
    }
  </script>
 
