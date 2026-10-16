# Mein Handy OS — PWA Demo

Diese Änderungen implementieren und bereinigen die PWA-Funktionalität für das "Modern Minimalist OS" Demo. Änderungen wurden auf dem Branch `pwa/add-icons` vorgenommen.

Was enthalten ist:

- manifest.json: korrigierte PWA-Metadaten und Verweise auf lokale Icon-Dateien (SVG).
- sw.js: robuster Service Worker mit lokalem Precache und Offline-Fallback.
- icons/: zwei SVG-Icons (192 & 512) im Repo.
- app.js: aufgeräumte Laufzeitlogik (Uhr, Batterie, Kamera, App-Fenster, SW-Registrierung).
- index.html: aufgeräumte Hauptseite, lädt `app.js`.

Wie testen:

1. Öffne die Branch-Seite auf GitHub und erstelle einen Pull Request auf `main`.
2. Nach Merge: GitHub Pages wird die Seite deployen (achte auf den Pages-Branch/Settings).
3. In Chrome: DevTools → Application → Manifest / Service Workers prüfen.
4. Lighthouse (Audits) laufen lassen für PWA-Check.

Anmerkungen:

- Die Icons sind SVGs. Für bestes Verhalten auf Android kannst du zusätzlich PNGs (192/512) bereitstellen; der Manifest verweist derzeit auf die SVGs, die von modernen Browsern unterstützt werden.
- Externe Ressourcen (z. B. dicebear) werden nicht im Precache verwendet — lade externe Inhalte bei Bedarf lazy und cache sie zur Laufzeit.

Wenn du möchtest, kann ich:

- die Änderungen in einen PR öffnen (automatisch),
- zusätzlich PNG-Versionen der Icons generieren und hinzufügen,
- weiter aufräumen/Performance-Optimierungen durchführen.

Sag Bescheid, welche weiteren Schritte du willst.
