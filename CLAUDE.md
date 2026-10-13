# Chicago Ink Erftstadt – Hinweise für Claude

## Veröffentlichen (immer so vorgehen)

- Änderungen **immer direkt auf `main` committen und pushen** (`git push origin HEAD:main`), keine Feature-Branches oder Pull Requests – außer es wird ausdrücklich verlangt.
- Der Push auf `main` startet automatisch den Workflow „Deploy to GitHub Pages“ (`.github/workflows/deploy.yml`).
- **Nach jedem Push prüfen, ob das Deployment erfolgreich war**, und erst dann Bescheid geben, dass die Seite live ist.
- Live-Seite: https://syr0x96.github.io/chicago-ink/

## Vor dem Push

- `npm run build` muss fehlerfrei durchlaufen.
- Sichtbare Änderungen kurz im Browser prüfen (`npm run preview`).
