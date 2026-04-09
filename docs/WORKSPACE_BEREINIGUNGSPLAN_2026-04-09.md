# Workspace-Bereinigungsplan

- Datum: `2026-04-09`
- Uhrzeit: `20:46:54 CEST`
- Branch: `workspace-main-ai-20260406`
- Status: `Ticket 10 in progress`

## Ziel

Dieses Dokument trennt den aktuellen Dirty-Workspace in wartbare Themenbloeke, damit die naechste Arbeitsphase nicht wieder in einem unsortierten Mischzustand beginnt.

Wichtig: In diesem Schritt wurde bewusst noch kein grosser Commit-Split erzwungen. Die Aenderungen wurden zuerst in commitbare Cluster zerlegt, ohne unklare oder moeglicherweise benutzerspezifische Dateien blind mitzuschleifen.

## Snapshot

- `git status --short`: `123` geaenderte oder untracked Pfade
- `git diff --stat`: `107` geaenderte Dateien, `1873` Insertions, `450` Deletions
- Gestagter Stand: leer

Groesste Cluster:

- `functions`: `113` Pfade
- `src`: `16` Pfade
- `docs`: `7` Pfade
- `scripts`: `3` Pfade

Groesste Untercluster:

- `functions/_shared`: `13`
- `functions/scriptony-assistant`: `12`
- `functions/scriptony-shots`: `10`
- `functions/scriptony-project-nodes`: `10`
- `functions/scriptony-auth`: `10`
- `src/lib`: `9`
- `functions/scriptony-worldbuilding`: `7`
- `src/components`: `6`
- `functions/scriptony-stats`: `6`
- `functions/scriptony-audio`: `6`
- `functions/scriptony-ai`: `6`

## Commit-Gruppen

### Gruppe A: Docs, Verify und Deploy-Tooling

Ziel: Alles commitbar machen, was den aktuellen Stand dokumentiert, Verify-/Smoke-Werkzeuge liefert oder den dedizierten Deploy-Pfad fuer `scriptony-ai` erklaert.

Kernpfade:

- `.env.local.example`
- `.gitignore`
- `.npmrc`
- `docs/DEPLOYMENT.md`
- `docs/SMOKE_TEST_MATRIX.md`
- `docs/INTEGRATION_STABILISIERUNG_TICKETS.md`
- `docs/INTEGRATION_BEREINIGUNGSBASIS_2026-04-08.md`
- `docs/AUTH_TRANSPORT_VERTRAG_2026-04-08.md`
- `docs/AKTUELLER_STAND_2026-04-08_2317.md`
- `functions/README.md`
- `package.json`
- `functions/package.json`
- `scripts/verify-appwrite-parity.mjs`
- `scripts/smoke-user-flows.mjs`
- `scripts/deploy-appwrite-function-ai.sh`
- `functions/build-appwrite-deploy.mjs`
- `functions/scripts/`

Kommentar:

- Diese Gruppe ist der sicherste erste Commit.
- Hier steckt kaum Produktlogik drin, aber viel Arbeitswert fuer Reproduzierbarkeit und spaeteren Review.

### Gruppe B: Shared Runtime-, Auth- und Gateway-Basis

Ziel: Alles zusammenfassen, was den zentralen technischen Vertrag traegt.

Kernpfade:

- `functions/_shared/auth.ts`
- `functions/_shared/env.ts`
- `functions/_shared/http.ts`
- `functions/_shared/image-function-auth.ts`
- `functions/_shared/appwrite-users.ts`
- `src/lib/api-gateway.ts`
- `src/lib/api-client.ts`
- `src/lib/env.ts`
- `src/lib/auth/AppwriteAuthAdapter.ts`

Kommentar:

- Diese Gruppe enthaelt die eigentliche Stabilisierung von Transport, Auth und Fehlerklassifikation.
- Ticket 04, 05 und 09 haengen stark an diesen Dateien.
- Diese Gruppe sollte getrennt von Feature-UI und AI-Provider-UX reviewt werden.

### Gruppe C: Shared-Auth-Rollout in Function-Handlern

Ziel: Die vielen kleinen Handler-Aenderungen konsistent als einen eigenen Rollout committen.

Typische Aenderung:

- Wechsel von `requireUserBootstrap(req.headers.authorization)` auf `requireUserBootstrap(req)`
- oder Umstellung auf die leichte zentrale Auth-Stufe

Betroffene Bereiche:

- `functions/scriptony-auth/`
- `functions/scriptony-projects/`
- `functions/scriptony-worldbuilding/`
- `functions/scriptony-project-nodes/`
- `functions/scriptony-shots/`
- `functions/scriptony-clips/`
- `functions/scriptony-beats/`
- `functions/scriptony-characters/`
- `functions/scriptony-stats/`
- `functions/scriptony-logs/`
- `functions/scriptony-mcp-appwrite/`
- `functions/scriptony-style-guide/`
- `functions/scriptony-superadmin/_shared.ts`
- `functions/scriptony-audio/`
- `functions/scriptony-video/index.ts`
- `functions/scriptony-gym/index.ts`
- `functions/scriptony-image/ai/`

Kommentar:

- Diese Gruppe ist gross, aber sehr homogen.
- Der Review-Fokus ist hier nicht Produktverhalten, sondern Konsistenz des neuen Auth-Vertrags.

### Gruppe D: AI-Control-Plane und Assistant-Reintegration

Ziel: AI-spezifische Produktlogik getrennt von Basis-Transport und Shared-Auth halten.

Kernpfade:

- `functions/_shared/ai-central-store.ts`
- `functions/_shared/ai-service/`
- `functions/scriptony-ai/`
- `functions/scriptony-assistant/ai/`
- `functions/package-lock.json`
- `functions/scriptony-ai/package.json`
- `functions/scriptony-ai/package-lock.json`
- `docs/AI-SERVICE-REFACTOR.md`

Frontend/UX dazu:

- `src/components/AIIntegrationsSection.tsx`
- `src/components/ai/FeatureModelPicker.tsx`
- `src/components/pages/SettingsPage.tsx`
- `src/lib/ai-provider-allowlist.ts`
- `src/lib/ai-ui-copy.ts`

Kommentar:

- Diese Gruppe enthaelt die eigentliche Re-Integration von `scriptony-ai`.
- Sie sollte nach Gruppe B und C kommen, nicht davor.

### Gruppe E: Appwrite-Entry-Points und Packaging-Schnitt

Ziel: Die neue Deploy-/Entrypoint-Struktur als eigenen, kleinen Infrastruktur-Commit halten.

Kernpfade:

- `functions/scriptony-auth/appwrite-entry.ts`
- `functions/scriptony-beats/appwrite-entry.ts`
- `functions/scriptony-characters/appwrite-entry.ts`
- `functions/scriptony-project-nodes/appwrite-entry.ts`
- `functions/scriptony-projects/appwrite-entry.ts`
- `functions/scriptony-shots/appwrite-entry.ts`
- `functions/scriptony-worldbuilding/appwrite-entry.ts`

Kommentar:

- Diese Gruppe ist technisch eigenstaendig genug fuer einen separaten Commit.
- Sie sollte nicht mit AI-Produktlogik vermischt werden.

## Unklare oder lokale Artefakte

Diese Dateien sollten vor einem echten Commit bewusst entschieden werden und nicht automatisch mitlaufen:

- `repo-visualization.html`
- `repo-visualization-full.html`
- `deno.lock`
- `functions/deno.lock`

Aktuelle Einschaetzung:

- `repo-visualization*.html` wirken wie lokale Analyseartefakte
- `deno.lock` und `functions/deno.lock` koennen legitim sein, sollten aber nur mit Absicht in einen Commit wandern

## Empfohlene Reihenfolge

1. Gruppe A committen
2. Gruppe B committen
3. Gruppe C committen
4. Gruppe D committen
5. Gruppe E committen
6. Unklare Artefakte bewusst entscheiden

## Wiedereinstieg

Wenn die Bereinigung spaeter fortgesetzt wird, nicht mit Code-Fixes anfangen, sondern direkt mit dem Commit-Split:

- zuerst Gruppe A als sicheren Dokumentations-/Tooling-Commit
- danach Gruppe B als technischer Basis-Commit

Damit ist der naechste sinnvolle Schritt fuer Ticket 10 nicht mehr Analyse, sondern der erste echte Split-Commit.
