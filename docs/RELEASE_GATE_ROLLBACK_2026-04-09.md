# Release-Gate und Rollback-Plan

- Datum: `2026-04-09`
- Ticket: `11`
- Status: `verbindliche Freigabegrundlage fuer den aktuellen Integrationsstand`

## Letzte Gate-Ausfuehrung

- Zeitpunkt: `2026-04-09 23:12 CEST`
- Token-Basis: echter Demo-User-JWT aus der Appwrite-Serverkonfiguration
- `verify-appwrite-parity -- --require-auth`: gruen
- `smoke-user-flows`: gruen (`6/6`)
- Danach wurden `workspace-main-ai-20260406`, `integration-main-plus-ai-20260406` und `main` auf `01aa96f` vereinheitlicht.
- `integration-main-plus-ai-20260406` ist auf `origin/integration-main-plus-ai-20260406` gepusht.
- `main` ist auf `origin/main` gepusht.

## Referenzstand

Der letzte verifizierte Live-Stand fuer diese Integrationsrunde ist:

- `scriptony-ai` Deployment `69d7c509b600942df0a5`
- `verify-appwrite-parity -- --require-auth` gruen
- `smoke-user-flows` gruen (`6/6`)

Die zuletzt dokumentierten kritischen Basis-Deployments sind:

- `scriptony-auth` `69c30bbda32674b302f4`
- `scriptony-projects` `69c3ed2ba0cb4b168a69`
- `scriptony-worldbuilding` `69cee36142af761bb878`

Quelle fuer diese Referenzen:

- [docs/AKTUELLER_STAND_2026-04-08_2317.md](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/docs/AKTUELLER_STAND_2026-04-08_2317.md)
- [docs/INTEGRATION_BEREINIGUNGSBASIS_2026-04-08.md](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/docs/INTEGRATION_BEREINIGUNGSBASIS_2026-04-08.md)

## Merge-Gate

Vor einem Merge in den Integrations- oder Hauptbranch muss alles hier gruen sein:

1. `git log` zeigt die thematischen Split-Commits nachvollziehbar getrennt.
2. `git status` zeigt keine unerwarteten Produktdateien mehr.
3. Die einzigen offenen lokalen Artefakte duerfen hoechstens diese vier sein:
   - `deno.lock`
   - `functions/deno.lock`
   - `repo-visualization.html`
   - `repo-visualization-full.html`
4. `npm run typecheck` ist gruen.
5. `npm --prefix functions run build:scriptony-ai` ist gruen.
6. Fuer neue Appwrite-Entry-Points oder Packaging-Schnitte bundlen die betroffenen Entry-Dateien lokal erfolgreich.
7. Die Statusdoku ist aktuell:
   - [docs/INTEGRATION_STABILISIERUNG_TICKETS.md](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/docs/INTEGRATION_STABILISIERUNG_TICKETS.md)
   - [docs/AKTUELLER_STAND_2026-04-08_2317.md](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/docs/AKTUELLER_STAND_2026-04-08_2317.md)

## Deploy-Gate

Vor einem echten Live-Deploy muss alles hier gruen sein:

1. Der Deploy-Scope ist klein und explizit.
2. Bei AI-Aenderungen wird zuerst nur `scriptony-ai` deployt, nicht der ganze Function-Bestand.
3. `npm run verify:parity -- --require-auth` ist direkt vor dem Release gruen.
4. `npm run smoke:user-flows` ist direkt vor dem Release gruen.
5. Die sechs Referenzfluesse bleiben gruen:
   - `/profile`
   - `/projects`
   - `/worlds`
   - `/settings`
   - `/ai/settings`
   - `/ai/conversations`
6. Bei Function-Aenderungen ist klar, welche letzte stabile Deployment-ID je kritischer Function als Rueckfall dient.
7. Keine produktive Freigabe, wenn nur `/health` gruen ist, aber auth-geschuetzte Reads nicht geprueft wurden.

## Empfohlene Deploy-Reihenfolge

1. Lokale Verifikation laufen lassen.
2. Kleinstmoeglichen Function-Scope deployen.
3. Sofort `verify:parity -- --require-auth` laufen lassen.
4. Sofort `smoke:user-flows` laufen lassen.
5. Erst danach Frontend- oder Env-Aenderungen freigeben, falls sie Teil desselben Release-Schnitts sind.

## Rollback-Ausloeser

Sofortiger Rollback statt weiterem Debugging im Live-Zustand, wenn eines davon auftritt:

- `401` auf Basis-Reads wie `/projects` oder `/worlds`
- `500` auf `/ai/settings` oder `/ai/conversations`
- `verify:parity -- --require-auth` rot
- `smoke:user-flows` nicht mehr `6/6`
- CORS-/Routing-Bruch, der den Browserpfad fuer normale eingeloggte User blockiert

## Rollback-Pfad

1. Nur den betroffenen Scope zurueckrollen, nicht blind alles.
2. Bei AI-Problemen zuerst `scriptony-ai` auf das letzte verifizierte Deployment `69d7c509b600942df0a5` zuruecksetzen.
3. Bei Basisproblemen `scriptony-auth`, `scriptony-projects` und `scriptony-worldbuilding` auf die letzten dokumentierten stabilen Deployments zuruecksetzen.
4. Keine ad-hoc Codefixes direkt auf einer bereits roten Produktion freigeben, solange der letzte stabile Stand noch erreichbar ist.
5. Nach dem Rollback sofort erneut ausfuehren:
   - `npm run verify:parity -- --require-auth`
   - `npm run smoke:user-flows`
6. Erst wenn diese Checks wieder gruen sind, beginnt die Ursachenanalyse fuer einen neuen Release-Versuch.

## Was nicht rollbacken

- Die bereits angelegte `scriptony_ai.user_settings`-Collection wird nicht entfernt.
- Bereits eingefuehrte kompatible Datenstrukturen oder additive Attribute werden nicht hektisch rueckgebaut.
- Die vier lokalen Artefakte im Repo-Root bzw. unter `functions/` sind kein Produktionsrollback-Thema.

## Freigabeentscheidung

Ein Release gilt nur dann als freigegeben, wenn:

- Merge-Gate gruen
- Deploy-Gate gruen
- Rollback-Ziel explizit benannt
- der verantwortliche Scope klein genug ist, um im Fehlerfall schnell zurueckgesetzt zu werden
