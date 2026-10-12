# Neon Drive Arcade

Synthwave-Themenseite, rein statisch (HTML, CSS, JavaScript). Teil einer Reihe kleiner Themen-Websites.

**Live:** https://intingtion.github.io/synthwave-arcade/

## Gestaltungsidee
- Farbwelt: Neon-Pink, Cyan und Gelb auf tiefem Violett
- Schrift: Orbitron (Überschriften), Share Tech Mono (Text)
- Signature-Animation: perspektivisches Grid, das in den Horizont scrollt, davor eine Sonne mit Scanlines

## Konfiguration
Alles Inhaltliche und Farbliche steht in `config.json`:
- `meta`: Titel, Beschreibung, Sprache
- `theme`: Farben und Schriften (werden als CSS-Variablen gesetzt)
- `sections`: pro Sektion `enabled` plus Inhalte; die Reihenfolge in der Datei bestimmt die Reihenfolge auf der Seite

## Lokal starten
`config.json` wird per `fetch` geladen, daher einen kleinen Webserver verwenden:

```
python -m http.server 8000
```

Dann http://localhost:8000 öffnen.
