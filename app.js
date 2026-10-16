/* app.js additions: battery indicator + keep existing behavior */

// battery UI: read navigator.getBattery and update .battery-level width
async function initBattery(){
  const levelEl = document.getElementById('batteryLevel')
  const batteryWrap = document.getElementById('battery')
  const chargingEl = document.getElementById('batteryCharging')
  const clockEl = document.getElementById('statusClock')

  function setClock(){
    const d = new Date()
    const m = d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})
    if (clockEl) clockEl.textContent = m
  }
  setClock(); setInterval(setClock, 60*1000)

  if (!navigator.getBattery){
    // fallback: show 77% (placeholder)
    if (levelEl) levelEl.style.width = '77%'
    return
  }
  try{
    const b = await navigator.getBattery()
    function update(){
      const pct = Math.round(b.level * 100)
      if (levelEl) levelEl.style.width = Math.max(2, pct) + '%'
      if (b.charging){ batteryWrap.classList.add('charging'); chargingEl.style.opacity = 1 } else { batteryWrap.classList.remove('charging'); chargingEl.style.opacity = 0 }
    }
    update()
    b.addEventListener('levelchange', update)
    b.addEventListener('chargingchange', update)
  }catch(e){ console.warn('Battery API failed', e); if (levelEl) levelEl.style.width='77%' }
}

// call initBattery on DOM ready
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBattery)
else initBattery()

// keep rest of app.js (revamp) behavior — ensure exported functions still available
