# Auth- und Transportvertrag

Stand: 2026-04-08

Status: Verbindliche Entscheidungsgrundlage fuer Ticket 03 aus [docs/INTEGRATION_STABILISIERUNG_TICKETS.md](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/docs/INTEGRATION_STABILISIERUNG_TICKETS.md)

## Kontext

Im aktuellen Workspace wurden zwei gekoppelte Architekturthemen gleichzeitig angefasst:

- der Browser ruft Functions lokal ueber `Functions.createExecution(...)` auf, siehe [src/lib/api-gateway.ts](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/src/lib/api-gateway.ts)
- die Functions lesen Auth nicht mehr nur aus `Authorization`, sondern ueber `requireUserBootstrap(req)`, siehe [functions/\_shared/auth.ts](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/functions/_shared/auth.ts)

Parallel dazu ist die bestehende Repo-Dokumentation bereits auf direkte Function-Domains und `VITE_BACKEND_FUNCTION_DOMAIN_MAP` als Browser-Pfad ausgerichtet, siehe [docs/DEPLOYMENT.md](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/docs/DEPLOYMENT.md) und [functions/README.md](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/functions/README.md).

## Problem

Die aktuelle `401`-Regression zeigt, dass fuer normale eingeloggte SPA-Requests nicht klar ist, welcher Transportpfad der gueltige Vertrag ist.

Ohne diese Entscheidung entstehen gleichzeitig:

- doppelte Transportlogik im Frontend
- irrefuehrende Fehlersignale
- handleruebergreifende Auth-Risiken
- unklare Deploy- und Runtime-Annahmen

## Entscheidung

### 1. Primaerpfad fuer browser-authentifizierte Requests

Fuer normale eingeloggte SPA-Requests ist ab sofort der verbindliche Primaerpfad:

- Browser ruft die HTTP-Function-Domain direkt auf
- Routing erfolgt ueber `api-gateway.ts` und `VITE_BACKEND_FUNCTION_DOMAIN_MAP`
- Auth wird als `Authorization: Bearer <appwrite-jwt>` uebertragen
- das JWT stammt aus `getAuthToken()` und damit aus der bestehenden Appwrite-Session

Begruendung:

- dieser Pfad ist bereits die dokumentierte Browser-Strategie im Repo
- dieser Pfad ist fuer lokale Entwicklung und deployte Functions transparent pruefbar
- dieser Pfad passt zu der existierenden dev-proxy- und Function-Domain-Architektur
- derselbe deployte Backend-Stand lieferte am `2026-04-06` fuer `/projects` und `/worlds` noch `200`
- die spaeteren `401` traten zeitlich passend nach dem lokalen `createExecution`-Umbau auf

### 2. `createExecution` ist nicht der Primaerpfad fuer normale SPA-CRUD-Flows

`Functions.createExecution(...)` ist fuer den Browser nicht der verbindliche Standardpfad fuer:

- `GET /projects`
- `GET /worlds`
- normale CRUD-Requests in Projects, Worldbuilding, Nodes, Shots, Characters, Settings

`createExecution` darf nur als expliziter Sonderpfad betrachtet werden fuer:

- interne oder administrative Ausfuehrungen
- serverseitig initiierte Calls
- klar begrenzte Migrations- oder Diagnosepfade
- Faelle, in denen der User-Kontext ueber die konkrete Appwrite-Runtime nachweislich stabil ankommt

Bis dieser Nachweis fuer die aktuelle self-hosted Appwrite-Umgebung erbracht ist, ist `createExecution` fuer normale browser-authentifizierte App-Flows als nicht verlaesslich zu behandeln.

### 3. Serverseitiger Auth-Vertrag

Serverseitig bleibt `requireUserBootstrap(req)` der gemeinsame Adapter. Der Adapter darf mehrere Quellen lesen, aber mit klarer Prioritaet und klarer Bedeutung.

Kanonische Reihenfolge:

1. `Authorization: Bearer <appwrite-jwt>`
   Das ist der Standard fuer normale browser-authentifizierte Requests.
2. `Authorization: Bearer <integration-token>`
   Nur fuer explizite Integrations- oder Systemzugriffe.
3. `x-appwrite-user-jwt`
   Nur als Kompatibilitaetsquelle, wenn Appwrite diesen Header selbst bereitstellt.
4. `x-appwrite-execution-id` plus `x-appwrite-user-id`
   Nur als trusted execution context fuer explizite interne Appwrite-Ausfuehrungen.

Wichtige Regel:

- der Browser setzt selbst nur `Authorization`
- der Browser setzt nicht aktiv `x-appwrite-user-jwt`
- trusted execution header gelten nicht als Standardvertrag fuer normale SPA-Requests

## Normative Regeln

### A. Frontend

- Die SPA beschafft User-Auth ausschliesslich ueber [src/lib/auth/getAuthToken.ts](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/src/lib/auth/getAuthToken.ts).
- Das Token stammt aus der aktuellen Appwrite-Session, siehe [src/lib/auth/AppwriteAuthAdapter.ts](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/src/lib/auth/AppwriteAuthAdapter.ts).
- Authentifizierte Browser-Requests senden `Authorization: Bearer <jwt>`.
- Browser-Requests verwenden Function-Domain oder Dev-Proxy, nicht `createExecution`, als Standardpfad.
- Ein `401` aus einer Function ist ein Auth-/Kontextfehler und darf nicht als Transportproblem umetikettiert werden.

### B. Functions

- Handler verwenden zentral [functions/\_shared/auth.ts](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/functions/_shared/auth.ts).
- Handler duplizieren keine eigene Auth-Logik.
- `requireUserBootstrap(req)` bleibt zulaessig und sinnvoll, aber der erwartete Browser-Eingang ist `Authorization`.
- `x-appwrite-user-jwt` ist nur ein serverseitiger Kompatibilitaetskanal.
- trusted execution headers sind ein Sonderkanal, kein Browser-Standard.

### C. Fallbacks und Mischbetrieb

- Es gibt genau einen aktiven Primaerpfad fuer browser-authentifizierte Requests.
- Ein impliziter Wechsel zwischen `createExecution` und direktem HTTP-Fetch ist fuer Auth-Faelle nicht Teil des Vertrags.
- `401`, `403` oder handlerseitige Auth-Fehler werden nicht in einen stillen Transport-Fallback uebersetzt.
- Sekundaerpfade sind nur hinter expliziter Entscheidung oder Debug-/Migrationskontext erlaubt.

## Erwartete Header- und Kontextmatrix

| Aufrufer                   | Transport                              | Erwarteter Auth-Eingang im Handler                   | Status                                    |
| -------------------------- | -------------------------------------- | ---------------------------------------------------- | ----------------------------------------- |
| SPA, eingeloggter User     | direkte Function-Domain oder Dev-Proxy | `Authorization: Bearer <appwrite-jwt>`               | primaer und verbindlich                   |
| externe Integration        | direkte Function-Domain                | `Authorization: Bearer <integration-token>`          | erlaubt fuer definierte Endpunkte         |
| Appwrite-interne Execution | `createExecution`                      | `x-appwrite-user-jwt` oder trusted execution headers | nur Sonderpfad                            |
| Gast/Public Health         | direkte Function-Domain                | keine User-Auth                                      | nur fuer oeffentliche Health-/Info-Routen |

## Appwrite- und Hosting-Annahmen

Dieser Vertrag ist auf die aktuelle Repo- und Runtime-Lage bezogen:

- self-hosted Appwrite `1.8.1`, dokumentiert in [DOCKER_SETUP.md](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/DOCKER_SETUP.md) und [infra/appwrite/docker-compose.yml](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/infra/appwrite/docker-compose.yml)
- Browser-Routing ueber Function-Domains ist bereits Repo-Standard, siehe [docs/DEPLOYMENT.md](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/docs/DEPLOYMENT.md)
- Functions validieren JWT serverseitig gegen die Function-Env, siehe [functions/\_shared/env.ts](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/functions/_shared/env.ts)

Praktische Konsequenz:

- der Vertrag stuetzt sich auf den bereits dokumentierten und deploybaren Function-Domain-Pfad
- er stuetzt sich nicht auf eine momentan nur lokal angepasste und noch nicht belastbar verifizierte Browser-`createExecution`-Strategie

## User Journey

### Projects

1. Nutzer ist bei Appwrite eingeloggt.
2. Frontend holt per `getAuthToken()` ein JWT aus der bestehenden Session.
3. `GET /projects` wird ueber die zugeordnete Function-Domain gesendet.
4. Der Handler liest `Authorization`, validiert das JWT und bootstrapped den User.
5. Die Function antwortet mit `200` und einer Projektliste.

### Worldbuilding

1. Nutzer ist bei Appwrite eingeloggt.
2. Frontend holt per `getAuthToken()` ein JWT aus der bestehenden Session.
3. `GET /worlds` wird ueber die zugeordnete Function-Domain gesendet.
4. Der Handler liest `Authorization`, validiert das JWT und bootstrapped den User.
5. Die Function antwortet mit `200` und einer Weltenliste.

## Nicht Teil des Vertrags

- Browser setzt selbst `x-appwrite-user-jwt`
- Browser verlaesst sich fuer Standard-App-Flows auf trusted execution headers
- `createExecution` ist stiller Ersatz fuer normale browser-authentifizierte CRUD-Requests
- Auth-Fehler werden als bloesser Gateway- oder Network-Fehler behandelt

## Akzeptanzkriterien

- Die Primaerstrategie fuer authentifizierte Browser-Function-Calls ist schriftlich festgelegt.
- Die serverseitig erlaubten Auth-Quellen und ihre Prioritaet sind dokumentiert.
- Die Rolle von `createExecution` ist auf Sonderfaelle begrenzt und nicht mehr implizit.
- Die self-hosted Appwrite-`1.8.1`-Annahme ist dokumentiert.
- Es gibt keinen unklaren Mischbetrieb mehr ohne benannten Primaerpfad.

## Ergebnis

Ticket 03 ist damit auf Entscheidungs- und Architektur-Ebene umgesetzt.

Die operative Konsequenz fuer die Folgetickets lautet:

- Ticket 04 stellt die Basis-Flows auf dem hier definierten Primaerpfad wieder her
- Ticket 05 haertet den zentralen Auth-Adapter entlang genau dieses Vertrags
- Ticket 06 prueft Deploy- und Env-Paritaet gegen diesen Vertrag statt gegen Mischbetrieb
