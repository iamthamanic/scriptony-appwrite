# Aktueller Stand

- Datum: `2026-04-09`
- Uhrzeit: `20:46:54 CEST`
- Snapshot-Typ: `Arbeitsstand nach Fix von Ticket 09 und Dokumentationsupdate`

## Live-Zustand

- `scriptony-ai` ist live auf Deployment `69d7c509b600942df0a5`.
- `verify-appwrite-parity -- --require-auth` ist gruen.
- `smoke-user-flows` ist gruen.
- Alle sechs kritischen Live-Flows sind aktuell gruen:
  - `/profile`
  - `/projects`
  - `/worlds`
  - `/ai/settings`
  - `/ai/conversations`
  - `/settings`

## Was erledigt wurde

- Basis-Transport fuer normale SPA-Reads stabilisiert.
- Shared-Auth auf `requireUserBootstrap(req)` umgestellt und gehaertet.
- Zentrale Auth-Library um eine leichte User-Aufloesung ergaenzt und fuer `image`, `audio`, `video` und `gym` angeschlossen.
- Ticket 09 lokal umgesetzt:
  - Frontend-Gateway unterscheidet jetzt `transport`, `function-auth` und `function-response`
  - API-Client loggt Gateway-Fehler klar nach Layer statt generisch
  - Shared-Function-Errors tragen jetzt Codes wie `AUTH_UNAUTHORIZED`, `UPSTREAM_FETCH_FAILED`, `UPSTREAM_REQUEST_TERMINATED`
  - Auth-Fallback-Logs wurden auf zusammengefasste Warnungen statt mehrfache Error-Spam-Logs umgestellt
- Parity-Check aufgebaut:
  - [scripts/verify-appwrite-parity.mjs](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/scripts/verify-appwrite-parity.mjs)
- Smoke-Matrix aufgebaut:
  - [scripts/smoke-user-flows.mjs](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/scripts/smoke-user-flows.mjs)
  - [docs/SMOKE_TEST_MATRIX.md](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/docs/SMOKE_TEST_MATRIX.md)
- `scriptony-ai` lokal auf den neuen Routing-Pfad vorbereitet:
  - `/ai/*` ueber `scriptony-ai`
  - Legacy-Assistant-Routen ueber `assistant-legacy`
- Die fehlende AI-Datenbankstruktur wurde live gebootstrapped:
  - `scriptony_ai.user_settings` existiert jetzt
- Der dedizierte Deploy-Pfad fuer `scriptony-ai` wurde korrigiert:
  - [scripts/deploy-appwrite-function-ai.sh](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/scripts/deploy-appwrite-function-ai.sh)
  - [package.json](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/package.json)

## Verifizierter Befund

- Die fruehere `401`-Basisregression ist behoben.
- Der spaetere AI-Blocker war ein Runtime-Problem in `scriptony-ai`, nicht mehr im SPA-Gateway.
- Die Appwrite-Endpoint-Prioritaet musste fuer diese self-hosted Runtime angepasst werden:
  - `APPWRITE_ENDPOINT` vor `APPWRITE_FUNCTION_API_ENDPOINT`
- `scriptony-ai` lief zusaetzlich auf einem abweichenden lokalen Unterpaket mit `undici@6`, was fuer die Appwrite-Node-16-Runtime unpassend war.
- Der entscheidende Live-Fix war danach:
  - `scriptony-ai` startet nicht mehr mit globalem Fetch-Polyfill fuer alle Routen
  - der Polyfill wird nur noch fuer echte Provider-/Model-Endpunkte bei Bedarf nachgeladen
- Seit diesem Fix sind die AI-Read-Flows live wieder stabil.
- Ticket 09 ist lokal verifiziert:
  - `npm run typecheck` gruen
  - `npm --prefix functions run build:scriptony-ai` gruen
  - repraesentative Shared-Function-Builds fuer `scriptony-projects` und `scriptony-auth` gruen
- Der breite Live-Rollout der neuen Function-Logik aus Ticket 09 ist noch nicht separat ausgerollt. Das ist aktuell kein Produktblocker, aber noch offen.
- Ticket 10 hat jetzt den ersten echten Split-Commit:
  - `4b9a588` `chore: add appwrite parity and deployment tooling`
  - darin stecken Docs, Verify-/Smoke-Tooling und Deploy-Helfer aus Gruppe A

## Lokal vorbereitete Arbeiten

- [functions/_shared/ai-central-store.ts](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/functions/_shared/ai-central-store.ts)
- [functions/_shared/auth.ts](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/functions/_shared/auth.ts)
- [functions/_shared/env.ts](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/functions/_shared/env.ts)
- [functions/scriptony-ai/package.json](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/functions/scriptony-ai/package.json)
- [functions/scriptony-ai/index.ts](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/functions/scriptony-ai/index.ts)
- [functions/scriptony-ai/assistant-legacy.ts](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/functions/scriptony-ai/assistant-legacy.ts)

## Naechster sinnvoller Schritt

Der letzte Live-Blocker ist geloest. Die naechsten sinnvollen Schritte sind jetzt wieder Hygiene und Integration:

- Ticket 10:
  - mit Gruppe B des Bereinigungsplans weitermachen
- Ticket 11:
  - Release-Gate und Rollback-Doku festziehen

## Ticket-5-Richtung

Ticket 5 wird architektonisch nicht mehr als "alle Handler muessen denselben schweren Bootstrap nutzen" verstanden.

Die Zielrichtung ist jetzt:

- eine zentrale Auth-Library
- eine leichte User-Aufloesung fuer schlanke Services
- ein voller Bootstrap-Pfad fuer komplexe Flows

Damit sollen `image`, `video`, `audio` und `assistant` auf demselben Auth-Vertrag aufbauen, ohne als eigenstaendige Sonderwelten auseinanderzulaufen.

## Referenzdokumente

- [docs/INTEGRATION_STABILISIERUNG_TICKETS.md](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/docs/INTEGRATION_STABILISIERUNG_TICKETS.md)
- [docs/INTEGRATION_BEREINIGUNGSBASIS_2026-04-08.md](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/docs/INTEGRATION_BEREINIGUNGSBASIS_2026-04-08.md)
- [docs/AUTH_TRANSPORT_VERTRAG_2026-04-08.md](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/docs/AUTH_TRANSPORT_VERTRAG_2026-04-08.md)
