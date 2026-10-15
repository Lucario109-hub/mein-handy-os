  <script>
    // 1. LIVE UHRZEIT & DATUM LOGIK
    function updateDateTime() {
      const now = new Date();
      
      // Zeit
      let hh = String(now.getHours()).padStart(2, '0');
      let mm = String(now.getMinutes()).padStart(2, '0');
      
      const timeEl = document.getElementById('live-time');
      if(timeEl) timeEl.innerText = `${hh}:${mm}`;
      
      // Datum
      const dateEl = document.getElementById('live-date');
      if(dateEl) {
        const options = { day: '2-digit', month: 'short' };
        dateEl.innerText = now.toLocaleDateString('de-DE', options);
      }
    }
    setInterval(updateDateTime, 1000);
    updateDateTime();

    // 2. LIVE BATTERIE LOGIK (Web API)
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        function updateBatteryUI() {
          const batEl = document.getElementById('bat-level');
          if(batEl) batEl.style.width = (battery.level * 100) + '%';
        }
        updateBatteryUI();
        battery.addEventListener('levelchange', updateBatteryUI);
      }).catch(err => console.log("Batterie-API nicht unterstützt:", err));
    }

    // 3. WINDOW MANAGER LOGIK
    let activeStream = null;

    function openApp(id) {
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
    async function startKamera() {
      const video = document.getElementById('camera-stream');
      const errDiv = document.getElementById('camera-error');
      if(errDiv) errDiv.style.display = "none";

      try {
        activeStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, 
          audio: false 
        });
        if(video) video.srcObject = activeStream;
      } catch (err) {
        console.error("Kamerafehler: ", err);
        if(errDiv) {
          errDiv.innerText = "Fehler: Keine Kamera gefunden oder Zugriff verweigert.";
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
      if(video) video.srcObject = null;
    }

    // 5. TIC-TAC-TOE SPIEL LOGIK (JETZT KORREKT!)
    let boardState = ["", "", "", "", "", "", "", "", ""];
    let currentPlayer = "X";
    let gameActive = true;
    
    // Vollständige Gewinn-Kombinationen (Indizes im 3x3 Grid)
    const winConditions = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Horizontal
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Vertikal
      [0, 4, 8], [2, 4, 6]             // Diagonal
    ];

    function makeMove(cellIndex) {
      const cells = document.querySelectorAll('.ttt-cell');
      if (boardState[cellIndex] !== "" || !gameActive) return;

      boardState[cellIndex] = currentPlayer;
      cells[cellIndex].innerText = currentPlayer;
      cells[cellIndex].classList.add(currentPlayer);

      checkResult();
    }

    function checkResult() {
      let roundWon = false;
      for (let i = 0; i < winConditions.length; i++) {
        const [a, b, c] = winConditions[i];
        if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
          roundWon = true;
          break;
        }
      }

      const statusEl = document.getElementById('ttt-status');

      if (roundWon) {
        if(statusEl) statusEl.innerText = `Gewonnen: Spieler ${currentPlayer}!`;
        gameActive = false;
        return;
      }

      if (!boardState.includes("")) {
        if(statusEl) statusEl.innerText = "Unentschieden!";
        gameActive = false;
        return;
      }

      currentPlayer = currentPlayer === "X" ? "O" : "X";
      if(statusEl) statusEl.innerText = `Spieler ${currentPlayer} ist dran`;
    }

    function resetGame() {
      boardState = ["", "", "", "", "", "", "", "", ""];
      currentPlayer = "X";
      gameActive = true;
      const statusEl = document.getElementById('ttt-status');
      if(statusEl) statusEl.innerText = "Spieler X ist dran";
      document.querySelectorAll('.ttt-cell').forEach(cell => {
        cell.innerText = "";
        cell.className = "ttt-cell";
      });
    }

    // 6. SERVICE WORKER REGISTRIERUNG
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('Service Worker aktiv: ', reg.scope))
          .catch(err => console.error('Service Worker Fehler: ', err));
      });
    }
  </script>
