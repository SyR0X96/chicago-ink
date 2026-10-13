# Chicago Ink Erftstadt – Website

One-Pager mit 3D-Hero (Tinten-Partikel-Logo), 3D-Tattoo-Konfigurator und WhatsApp als Hauptkontaktweg.
Gebaut mit Vite, Three.js, GSAP und Lenis. Das Ergebnis ist eine statische Seite und läuft auf GitHub Pages oder jedem Webspace.

## Vor dem Livegang ausfüllen

Alle Kontaktdaten stehen zentral in **`src/config.js`**:

| Feld | Status |
|---|---|
| `whatsapp` | **Platzhalter** – echte Nummer ohne `+` und ohne führende 0 eintragen, z. B. `491712345678` |
| `phone` | **Platzhalter** – echte Telefonnummer |
| `legal.*` | **Platzhalter** – Inhaber:in, Rechtsform, USt-ID, Aufsichtsbehörde (für das Impressum) |
| `googleReviews` | optional – Link zu den Google-Bewertungen, dann erscheint ein Button |
| Labon | Foto und Instagram fehlen noch (`artists` in `src/config.js`, Foto nach `public/img/artists/`) |

Impressum und Datenschutz (`impressum.html`, `datenschutz.html`) sind Vorlagen und sollten rechtlich geprüft werden.

## Befehle

Node.js liegt unter `~/.local/node`. Einmal pro Terminal-Sitzung:

```bash
export PATH="$HOME/.local/node/bin:$PATH"
```

```bash
npm run dev      # Entwicklungsserver auf http://localhost:5173
npm run build    # fertige Seite nach dist/
npm run preview  # dist/ lokal ansehen
npm run images   # Bilder aus ../chicago-ink-site neu optimieren
```

## Veröffentlichen

Inhalt von `dist/` hochladen (GitHub Pages, Netlify, Webspace). Alle Pfade sind relativ, ein Unterordner funktioniert also auch.

## Inhalte pflegen

- **Galerie:** `src/data/gallery.js` (Titel, Stil, Artist, Showcase-Reihenfolge). Neue Bilder in `scripts/optimize-images.mjs` eintragen und `npm run images` ausführen.
- **Bewertungen:** `src/data/reviews.js`
- **Crew:** `artists` in `src/config.js`
- **Texte:** direkt in `index.html`

## Aufbau

```
index.html                      Seite (alle Texte)
src/config.js                   Kontaktdaten, Öffnungszeiten, Crew
src/main.js                     Scroll, Animationen, Galerie, Lightbox, Formulare
src/modules/hero/               3D-Hero (Partikel-Logo, Tintenrauch)
src/modules/configurator/       3D-Konfigurator (Körper, Stencil-Vorlage, Anfrage)
src/styles/main.css             Design
public/img/                     optimierte Bilder (WebP)
```

## Datenschutz

Keine Cookies, kein Tracking. Schriften liegen lokal, es gibt keine Verbindung zu Google Fonts. Die OpenStreetMap-Karte lädt erst nach Klick. WhatsApp-Links sind einfache Links ohne Widget-Skript. Bilder im Konfigurator verlassen das Gerät nicht.
