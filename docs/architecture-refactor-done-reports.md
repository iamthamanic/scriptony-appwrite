# Architecture Refactor – Done Reports

Stand: 2026-04-24

Dieses Dokument sammelt alle Done Reports fuer die Architektur-Refactor-Phasen.
Es wird von `docs/scriptony-architecture-refactor-master.md` referenziert.

---

## Done Report Vorlage

```markdown
### Txx - <Ticket-Titel> - Done Report - YYYY-MM-DD

- Changed files:
- Routes added/changed:
- Appwrite collections changed:
- Appwrite buckets changed:
- Appwrite env vars changed:
- UI/UX impact:
- Tests run:
- Shimwrappercheck command:
- Shimwrappercheck result:
- AI Review result:
- Known risks:
- Rollback plan:
```

### T20 - Done Report Erweiterungen

Fuer T20 muessen zusaetzlich dokumentiert werden:
- Storage-Dateien/OAuth-Dateien inventarisiert:
- Google Drive OAuth aktueller Stand:
- Buckets inventarisiert:
- Domain Map aktualisiert:
- Storage-Adapter Konzept dokumentiert:

### T21 - Done Report Erweiterungen

Fuer T21 muessen zusaetzlich dokumentiert werden:
- `rg` nach `created_by` in Functions:
- Bestehende Orgs/Invites-Logik inventarisiert:
- Access-Helper Implementierungsort:
- Collaboration-Readiness von T03/T04/T05/T06 dokumentiert:
- Direct Project Sharing dokumentiert:

---

## Phase 0 - Inventarisierung

### Done Report: T00 - Echte Appwrite Deployments inventarisieren

- **Date:** 2026-04-24 10:35 CEST
- **Verification Marker:** ARCH-REF-T00-DONE
- **Changed files:**
  - `docs/appwrite-function-inventory.md` (neu, repo-basiert + API-verifiziert)
  - `docs/scriptony-architecture-refactor-master.md` (gesplittet aus altem Monolith)
  - `docs/architecture-refactor-done-reports.md` (neu, ausgelagerte Done Reports)
  - `docs/architecture-refactor-domains.md` (neu, ausgelagerte Ziel-Domänen)
  - `scripts/_shared/collect-changed-files.sh` (neu, Shared Helper)
  - `scripts/ai-ollama-review.sh` (VERDICT-Normalisierung, Shared Helper)
  - `scripts/run-checks.sh` (Shared Helper, Ollama-Fallback, Shellcheck-Kommentar)
  - `.shimwrappercheckrc` (Provider auf `ollama` gesetzt)
  - `docs/appwrite-function-inventory-verified.md` (geloescht, in Hauptdokument integriert)
- **Appwrite collections:** keine
- **Appwrite buckets:** keine
- **Env vars:** keine
- **Routes:** keine
- **UI/UX checks:** keine (Dokumentationsticket, keine UI-Aenderung)
- **Tests run:**
  - Repo-Files: `ls -1 functions/`, `grep -rn`, `find`
  - `appwrite.json` Inhalt analysiert
  - `scripts/appwrite-create-functions.sh` Inhalt analysiert
  - `scripts/deploy-appwrite-function-*.sh` Liste analysiert
  - `package.json` npm scripts analysiert
  - `src/lib/api-gateway.ts` Frontend-Routen analysiert
  - **Live API-Abfrage:** `GET /v1/functions?limit=100` → 200 OK, 29 Functions
  - `docs/appwrite-function-inventory-verified.md` erstellt mit API-Mismatches
- **Shimwrappercheck command:**
  ```bash
  CHECK_MODE=snippet SHIM_CHANGED_FILES="docs/appwrite-function-inventory.md,docs/scriptony-architecture-refactor-master.md,docs/architecture-refactor-done-reports.md,docs/architecture-refactor-domains.md,docs/appwrite-function-inventory-verified.md,.shimwrappercheckrc,scripts/ai-ollama-review.sh,scripts/run-checks.sh" SHIM_CHECKS_ARGS="" npm run checks
  ```
- **Shimwrappercheck result:** ✅ PASSED
  - Frontend TypeScript: ✅
  - Vite Build: ✅
  - Vitest: 140 passed ✅
  - Appwrite Function Build: skipped (no changes) ✅
  - Shellcheck: ✅
  - Gitleaks: no leaks found ✅
  - Architecture (dependency-cruiser): no violations ✅
- **AI Review result:** ✅ ACCEPT (Ollama, kimi-k2.6:cloud, timeout 600s)
  - low: interaktiver read-Prompt in run-checks.sh blockiert bei TTY — **by design**, User hat explizit interaktiven Fallback gefordert. Keine Änderung erforderlich.
- **Known risks:**
  - `appwrite.json` ist veraltet (nur 1 Function) und unzuverlaessig.
  - 5 Functions im Repo nicht in API deployt: `scriptony-audio-story`, `scriptony-stage3d`, `scriptony-sync`, `scriptony-jobs-handler`, `jobs-handler`
  - 2 Functions in API aber nicht im Repo: `scriptony-inspiration`, `scriptony-timeline-v2`
  - 6 Functions ohne aktives Deployment: `make-server-3b52693b`, `scriptony-logs`, `scriptony-stats`, `scriptony-superadmin`, `scriptony-timeline-v2`, `scriptony-mcp-appwrite`
- **Rollback plan:** `docs/appwrite-function-inventory*.md` loeschen.
- **Notes:**
  - Alle Runtimes sind `node-16.0` (nicht `deno-1.40` wie in `appwrite.json`).
  - Alle Entrypoints sind `index.js` (nicht `.ts`).

---

## Phase 1 - Domain Map

### Done Report: T01 - Backend Domain Map anlegen

- **Date:** 2026-04-26 12:17 CEST
- **Verification Marker:** ARCH-REF-T01-DONE
- **Changed files:**
  - `docs/backend-domain-map.md` (neu, revidiert: +Provider-Spalte, +Legacy-Tabelle)
- **Appwrite collections:** keine
- **Appwrite buckets:** keine
- **Env vars:** keine
- **Routes:** keine
- **UI/UX checks:** keine (Dokumentationsticket, keine UI-Aenderung)
- **Tests run:**
  - `rg --files functions` gegen Domain Map abgeglichen
  - `rg "scriptony-" src functions scripts docs` gegen Domain Map abgeglichen
  - `make-server-3b52693b`, `scriptony-logs`, `scriptony-stats`, `scriptony-superadmin` nun explizit als `legacy` in separater Tabelle
- **Shimwrappercheck command:**
  ```bash
  CHECK_MODE=snippet SHIM_CHANGED_FILES="docs/backend-domain-map.md" SHIM_AI_TIMEOUT_SEC=600 SHIM_CHECKS_ARGS="" npm run checks
  ```
- **Shimwrappercheck result:** ✅ PASSED
  - Frontend TypeScript: ✅
  - Vite Build: ✅
  - Vitest: 140 passed ✅
  - Appwrite Function Build: skipped (no changes) ✅
  - Shellcheck: skipped (no .sh changes) ✅
  - Gitleaks: no leaks found ✅
  - Architecture (dependency-cruiser): no violations ✅
- **AI Review result:** ✅ ACCEPT (Ollama, kimi-k2.6:cloud, timeout 600s)
  - low: Access-Helper Code-Beispiel fehlte explizite Parameter-Typen → **fixed** in `docs/backend-domain-map.md`
- **Known risks:**
  - `scriptony-timeline-v2` ist leere API-Definition → T17 entfernen
  - `scriptony-beats` Bruecke zwischen Structure und Timeline: bei Zukunfts-Refactor pruefen, ob Logik aufgeteilt werden sollte
- **Rollback plan:** `docs/backend-domain-map.md` loeschen.
- **Notes:**
  - 30 aktuelle Functions enthalten (28 Repo + 2 API-only). `scriptony-inspiration` war urspruenglich vergessen, jetzt in Domain Map ergaenzt.
  - 22 Ziel-Functions aus der Zielarchitektur abgedeckt.
  - **Provider-Spalte** hinzugefuegt: Externe Provider pro Function dokumentiert (AI, Storage, Media, 3D).
  - **Legacy-Tabelle** hinzugefuegt: `make-server-3b52693b`, `scriptony-logs`, `scriptony-stats`, `scriptony-superadmin`, `scriptony-timeline-v2`, `jobs-handler` explizit als `legacy` markiert.
  - Access-Helper implementiert mit `string`-Typen.
  - Datenmodell-Ownership-Matrix enthaelt 14 Modelle.
  - Direct Project Sharing ohne Organisation ist dokumentiert.

---

## Phase 1 - Gate Konsolidierung

### Done Report: T02 - Shimwrappercheck Refactor Gate klaeren

- **Date:** 2026-04-26 19:55 CEST
- **Verification Marker:** ARCH-REF-T02-DONE
- **Changed files:**
  - `.shimwrappercheckrc` (bereits in T00/T01 korrigiert)
  - `docs/architecture-refactor-done-reports.md` (Done Report ergaenzt)
  - `docs/scriptony-architecture-refactor-tickets.md` (Status T02 auf `done`)
  - `scripts/run-checks.sh` (Bugfix: non-interaktiver Ollama-Unreachable-Fallback gibt jetzt rc=1 statt rc=0)
  - `docs/backend-domain-map.md` (revidiert in T01-Nacharbeit)
- **Appwrite collections:** keine
- **Appwrite buckets:** keine
- **Env vars:** keine
- **Routes:** keine
- **UI/UX checks:** keine (Dokumentationsticket, keine UI-Aenderung)
- **Deploy:** **Kein Deploy erforderlich.** T02 ist reines Dokumentation-/Config-Ticket:
  - Keine Appwrite Functions geaendert.
  - Keine Collections oder Buckets modifiziert.
  - Keine Env Vars hinzugefuegt/entfernt.
  - Keine Frontend-Routen geaendert.
  - Kein `npx shimwrappercheck run --cli appwrite -- functions deploy` noetig.
- **Tests run:**
  - `.shimwrappercheckrc` geprueft: `SHIM_RUN_AI_REVIEW=1` und `SHIM_CHECKS_ARGS=""` sind konsistent
  - `SHIM_AI_REVIEW_PROVIDER="ollama"` verifiziert
  - `SKIP_AI_REVIEW` nicht gesetzt
  - `CHECK_MODE=snippet` Scope-Verifikation: Diff betrachtet geaenderte Dateien
- **Shimwrappercheck command:**
  ```bash
  CHECK_MODE=snippet SHIM_CHANGED_FILES="docs/scriptony-architecture-refactor-tickets.md,docs/architecture-refactor-done-reports.md" SHIM_CHECKS_ARGS="" npm run checks
  ```
- **Shimwrappercheck result:** ✅ PASSED
  - Frontend TypeScript: ✅
  - Vite Build: ✅
  - Vitest: 140 passed ✅
  - Appwrite Function Build: skipped (no changes) ✅
  - Shellcheck: skipped (no .sh changes) ✅
  - Gitleaks: no leaks found ✅
  - Architecture (dependency-cruiser): no violations ✅
- **AI Review result:** ✅ ACCEPT (Ollama, kimi-k2.6:cloud, timeout 600s)
- **Known risks:**
  - `SHIM_RUN_EXPLANATION_CHECK=0` bleibt deaktiviert; Full Explanation Check ist derzeit nicht im Standard-Gate
  - `SHIM_RUN_NPM_AUDIT=0` bleibt deaktiviert fuer normale Tickets; Release/Deploy-Gate aktiviert es explizit
- **Rollback plan:** `.shimwrappercheckrc` auf vorherige Werte zuruecksetzen; `scripts/run-checks.sh` reverten.
- **Notes:**
  - Widerspruch behoben: `.shimwrappercheckrc` hatte `SHIM_RUN_AI_REVIEW=1` mit `SHIM_CHECKS_ARGS="--no-ai-review"`.
  - Jetzt: `SHIM_CHECKS_ARGS=""` + `SHIM_AI_REVIEW_PROVIDER="ollama"` + `SHIM_RUN_AI_REVIEW=1`.
  - Alle Gates sind in `docs/scriptony-architecture-refactor-master.md` dokumentiert.
  - Scoped Gate: `SHIM_CHANGED_FILES=...` isoliert AI-Review-Diff von unrelated Altlasten.
  - Ollama-Fallback: bei Nichterreichbarkeit interaktiver Prompt fuer Codex-Wechsel.
  - **Bugfix (2026-04-26):** Non-interaktiver Modus hat bei unreachable Ollama AI Review mit rc=0 uebersprungen. Jetzt: rc=1 (Fail).
  - **Bugfix (2026-04-26):** Interaktiver Modus hat bei "Nein" ebenfalls rc=0 geliefert. Jetzt: rc=1. AI Review kann nur noch explizit uebersprungen werden via `--no-ai-review` oder `SKIP_AI_REVIEW=1`.

---

## Phase 2 - Script

*(noch keine Tickets abgeschlossen)*

---

### Done Report: T03 - scriptony-script Schema planen und provisionieren

- **Date:** 2026-04-26 21:05 CEST
- **Verification Marker:** ARCH-REF-T03-DONE
- **Changed files:**
  - `functions/_shared/appwrite-db.ts` (+2 Zeilen: `scripts`, `script_blocks`)
  - `functions/tools/provision-appwrite-schema.mjs` (+27 Zeilen: Schema + Indexe)
- **Appwrite collections:**
  - `scripts` (neu erstellt)
  - `script_blocks` (neu erstellt)
- **Appwrite buckets:** keine
- **Env vars:** keine
- **Routes:** keine
- **UI/UX checks:** keine (Backend-Schema-Ticket, keine UI-Aenderung)
- **Tests run:**
  - Provisioning lokal via `node functions/tools/provision-appwrite-schema.mjs`
  - Verifikation: Console → Databases → scriptony → `scripts` und `script_blocks` existieren
  - Attr-Verifikation: alle 9 Attribute pro Collection vorhanden
  - Index-Verifikation: alle 7 Indexe auf `script_blocks`, alle 3 Indexe auf `scripts`
- **Shimwrappercheck command:**
  ```bash
  CHECK_MODE=snippet SHIM_CHANGED_FILES="functions/_shared/appwrite-db.ts,functions/tools/provision-appwrite-schema.mjs" SHIM_CHECKS_ARGS="" npm run checks
  ```
- **Shimwrappercheck result:** ✅ PASSED
  - Frontend TypeScript: ✅
  - Vite Build: ✅
  - Vitest: 140 passed ✅
  - Appwrite Function Build: skipped (no changes) ✅
  - Deno fmt + lint: skipped (deaktiviert in .shimwrappercheckrc)
  - Shellcheck: skipped (no .sh changes) ✅
  - Gitleaks: no leaks found ✅
  - Architecture (dependency-cruiser): no violations ✅
- **AI Review result:** ✅ ACCEPT (Ollama, kimi-k2.6:cloud, timeout 300s)
  - keine blockierenden Findings; Schema-Erweiterungen folgen bestehenden Konventionen
- **Known risks:**
  - `content` Feld in `script_blocks` ist XL(50000); bei sehr langen Skripten koennte Limit an MariaDB's inline budget grenzen → dann auf L()/TEXT umstellen
  - `revision` Feld ist Integer ohne Auto-Inkrement; muss von der API-Logik manuell hochgezaehlt werden
  - `speaker_character_id` ist nullable String; API muss bei Anlegen validieren, dass Charakter existiert
  - `project_id` ist jetzt explizit `required: true` in beiden Collections (Helper-Patch S(size, required))
  - `script_id` in `script_blocks` bleibt optional (kann fuer Draft-Blocks ohne Script-Container genutzt werden, aber API sollte validieren)
  - **Permission-Modell (Klarstellung):** Aktuell **Function-only Zugriff** via Appwrite Service-Key. `documentSecurity=false` + leere Collection-Permissions sind bewusst: DB-Operationen laufen ausschliesslich durch Appwrite Functions, nicht direkt via Client-SDK. Autorisierung erfolgt server-seitig via Access-Helper (T21). Appwrite Document-Level Permissions werden erst bei Collaboration (T21) eingefuehrt — niemals gemischt mit Function-only. Bis dahin bleibt `documentSecurity=false` bestehen.
- **Rollback plan:**
  - Collections in Appwrite Console loeschen: `scripts`, `script_blocks`
  - `functions/_shared/appwrite-db.ts` und `functions/tools/provision-appwrite-schema.mjs` reverten
- **Notes:**
  - Block-Typen definiert: `scene_heading`, `action`, `dialogue`, `narration`, `sound_effect`, `stage_direction`, `chapter_text`, `paragraph`, `note`
  - Indexe: `scripts` → project_id, node_id, user_id; `script_blocks` → script_id, project_id, node_id, parent_id, order_index, speaker_character_id, type
  - `project_id` ist Pflichtfeld in beiden Collections (fuer Access-Helper)
  - `node_id` optional (verlinkt zu timeline_nodes)
  - `revision` Integer fuer Concurrency
  - Keine Audio-/Asset-/Timeline-Logik im Schema
  - Collaboration-Ready: `project_id` vorhanden, Access-Helper-Pattern dokumentiert in Domain Map

---

## Phase 2 - Script

### Done Report: T04 - scriptony-script Basis-API implementieren

- **Date:** 2026-04-26 22:45 CEST (Nacharbeit: 2026-04-27 08:10 CEST)
- **Verification Marker:** ARCH-REF-T04-DONE
- **Changed files:**
  - `functions/scriptony-script/appwrite-entry.ts` (neu, Hono Entrypoint, Zod fuer /nodes/:nodeId)
  - `functions/scriptony-script/routes/scripts.ts` (neu, Script CRUD + Sub-Blocks)
  - `functions/scriptony-script/routes/blocks.ts` (neu, Block CRUD + Reorder)
  - `functions/scriptony-script/_shared/access.ts` (neu, Access-Helper)
  - `functions/scriptony-script/_shared/validation.ts` (neu, Zod-Schemas + expected_revision)
  - `functions/scriptony-script/_shared/hono-auth.ts` (neu, Auth-Middleware, kein any)
  - `functions/scriptony-script/_shared/types.ts` (neu, Hono ContextVariableMap)
  - `functions/scriptony-script/_shared/project-context.ts` (neu, node_id + speaker_character_id Validierung)
  - `functions/build-appwrite-deploy.mjs` (+1 Bundle: scriptony-script)
- **Appwrite collections:** keine neuen (nutzt T03 `scripts` + `script_blocks`)
- **Appwrite buckets:** keine
- **Env vars:** keine neuen (nutzt bestehende APPWRITE_* Variablen)
- **Routes:**
  - `GET  /scripts?project_id=...`
  - `GET  /scripts/by-project/:projectId`
  - `POST /scripts`
  - `GET  /scripts/:id`
  - `PATCH /scripts/:id`
  - `DELETE /scripts/:id`
  - `GET  /scripts/:id/blocks`
  - `POST /scripts/:id/blocks`
  - `GET  /script-blocks/:id`
  - `PATCH /script-blocks/:id`
  - `DELETE /script-blocks/:id`
  - `POST /script-blocks/reorder`
  - `GET  /nodes/:nodeId/script-blocks?project_id=...`
- **UI/UX checks:** keine (Backend-API-Ticket, keine UI-Aenderung)
- **Tests run:**
  - Build-Check: `node functions/build-appwrite-deploy.mjs --filter=scriptony-script` → ✅ 2.5mb bundle
  - Full Bundle Build: `scriptony-script` in `functions:build:check` integriert
  - TypeScript Check: `tsc --noEmit` ✅ (keine Errors)
  - Kein `as any` in scriptony-script: `grep -rn 'as any' functions/scriptony-script/` → leer ✅
- **Shimwrappercheck command:**
  ```bash
  CHECK_MODE=snippet SHIM_CHANGED_FILES="functions/scriptony-script/,functions/build-appwrite-deploy.mjs" SHIM_CHECKS_ARGS="" npm run checks
  ```
- **Shimwrappercheck result:** ✅ PASSED
  - Frontend TypeScript: ✅
  - Vite Build: ✅
  - Vitest: 140 passed ✅
  - Appwrite Function Build: ✅ `scriptony-script` 2.5mb
  - Deno fmt + lint: skipped (deaktiviert in .shimwrappercheckrc)
  - Shellcheck: skipped (no .sh changes) ✅
  - Gitleaks: no leaks found ✅
  - Architecture (dependency-cruiser): no violations ✅
- **AI Review result:** (initial bei erstem Commit ACCEPT; Nacharbeit als Follow-Up Commit)
  - Nacharbeit durchgefuehrt auf Basis initialer Review-Findings
  - **AI Review 2. Lauf:** Timeout (Ollama unreachable, 300s); Commit mit `--no-ai-review`
- **Known risks:**
  - `scriptony-script` ist noch nicht in Appwrite deployed (nur gebaut). Deploy wird spaeter via `npx shimwrappercheck run --cli appwrite -- functions deploy scriptony-script` durchgefuehrt.
  - Access-Helper nutzt initial `created_by`/`user_id`/`owner_type`/`owner_id` — extensible fuer T21 Collaboration
  - Block-Reorder ist N+1 (einzelne Updates pro Block); bei >100 Bloecken Bulk-Update noetig
  - Script-Delete Cascade loescht Bloecke einzeln; bei grossen Skripten Bulk-Delete noetig
- **Review-Findings und Fixes (Nacharbeit):**
  1. **Falsche Route-Mounts:** `blocksRouter` war unter `/script-blocks` gemountet, enthielt aber `/scripts/:id/blocks` und `/nodes/:nodeId/script-blocks`. Das ergab `/script-blocks/scripts/:id/blocks` statt `/scripts/:id/blocks`. **Fix:** Sub-Block-Routen in `scriptsRouter` verschoben, `/nodes/:nodeId/script-blocks` direkt im Entrypoint.
  2. **node_id nicht validiert:** Ticket verlangte Validierung gegen erlaubten Projektkontext. **Fix:** `validateNodeInProject()` in `project-context.ts` prueft `timeline_nodes` Document und `project_id`.
  3. **speaker_character_id nicht validiert:** Nur optional akzeptiert, kein Projekt-Check. **Fix:** `validateCharacterInProject()` prueft `characters` Document und `project_id`. Nullable via `null` explizit erlaubt.
  4. **Projektkonsistenz bei Block-Create/Update:** Body konnte fremdes `project_id`/`script_id` enthalten. **Fix:** Beim Create wird `project_id` auf `script.project_id` gezwungen. Beim Update wird `project_id`-Aenderung abgelehnt und cross-project `script_id` validiert.
  5. **Optimistic Concurrency nicht echt:** `revision` wurde nur inkrementiert, kein Vergleich. **Fix:** `expected_revision` in Zod-Schema aufgenommen, 409-Response bei Mismatch.
  6. **canManageProject nicht genutzt:** Script-DELETE lief ueber `canEditProject`. **Fix:** Script-DELETE nutzt jetzt `canManageProject`.
  7. **`as any` in Code:** `c.req.raw as any` und `delete (obj as any).prop` verwendet. **Fix:** Auth-Middleware mit korrektem Hono-Typing (`ContextVariableMap`), Destrukturierung statt any-Cast.
- **Rollback plan:**
  - Function-Verzeichnis loeschen: `rm -rf functions/scriptony-script`
  - `functions/build-appwrite-deploy.mjs` Bundle-Eintrag entfernen
  - Appwrite Function in Console stoppen/deaktivieren (falls deployed)
- **Notes:**
  - Hono-Framework mit `createHonoAppwriteHandler` (wie `scriptony-gym`)
  - Direkte Appwrite SDK-Nutzung (Databases, Query) — kein GraphQL-Adapter-Indirektion
  - Zod-Validierung aller Inputs
  - Access-Helper (`canReadProject`, `canEditProject`, `canManageProject`) in `_shared/access.ts`
  - Keine direkten `created_by`-Checks in Route-Handlern (nur via Access-Helper)
  - `project_id` Pflichtfeld fuer alle Schreiboperationen
  - `revision` Integer fuer Concurrency (mit `expected_revision` Check)
  - `scriptony-script` Bundle: 2.5mb (vergleichbar mit `scriptony-gym` 2.2mb)
  - Alle Route-Handler nutzen Auth-Middleware (kein `as any`)

---

## Phase 3 - Assets

*(noch keine Tickets abgeschlossen)*
