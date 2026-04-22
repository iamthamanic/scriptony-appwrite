# Integrations- und Stabilisierungstickets

Stand: 2026-04-11 08:24 CEST

## Aktueller Umsetzungsstand

- Letzter verifizierter Live-Stand:
  `scriptony-auth` `69d9e82352a8ac512d5b`, `scriptony-projects` `69d9e8787a1f5620f127`, `scriptony-worldbuilding` `69d9e88c68c7c3377214`, `scriptony-ai` `69d9e8b927c3ba8095e8`
- Letzte erfolgreiche Gate-Ausfuehrung:
  `2026-04-09 23:12 CEST` mit echtem Demo-User-JWT
- Letzter Workspace-Stand:
  auf demselben dokumentierten Release-Schnitt wie Integration und `main`
- Letzter Ticket-10-Split-Commit:
  `70a14ed` (`fix: align residual routes and backend config helpers`)
- Letzter Integrationsbranch-Stand:
  verifiziert, gepusht und mit `main` vereinheitlicht
- Hauptbranch:
  verifiziert, gepusht und mit dem dokumentierten Release-Schnitt synchron
- Live-Verifikation:
  `verify-appwrite-parity` gruen fuer Deployment/Env/Health; authentifizierte Reads zusaetzlich ueber `smoke-user-flows` mit Demo-User-JWT verifiziert
- Smoke-Matrix:
  `smoke-user-flows` gruen (`6/6`)
- Feature-Rollout-Smoke:
  `smoke:feature-auth-rollout` gruen (`5/5`)
- Naechster sinnvoller Wiedereinstieg:
  Kein akuter Produktblocker. Als naechstes optional Release-/Doku-Nachzug fuer den Ticket-09-Recovery-Schnitt oder anderes gezieltes Hardening angehen.

### Ticket-Status

| Ticket | Status                                              | Kurzstand                                                                                                                    |
| ------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 01     | erledigt                                            | Workspace- und Deployment-Snapshot dokumentiert                                                                              |
| 02     | erledigt                                            | Branch-/Commit-Landkarte vorhanden                                                                                           |
| 03     | erledigt                                            | Auth-/Transportvertrag definiert                                                                                             |
| 04     | erledigt, live verifiziert                          | `/projects` und `/worlds` wieder stabil                                                                                      |
| 05     | erledigt, live verifiziert                          | `image`, `audio`, `gym`, `assistant` und `video` ueber zentralen Auth-/Deploy-Pfad live verifiziert                          |
| 06     | erledigt, live verifiziert                          | Deploy-/Env-Paritaet und Auth-Smokes vorhanden                                                                               |
| 07     | fuer aktuellen Kernscope erledigt, live verifiziert | `scriptony-ai` reintegriert und AI-Read-Flows gruen                                                                          |
| 08     | erledigt, live verifiziert                          | Smoke-Matrix steht und ist aktuell `6/6` gruen                                                                               |
| 09     | erledigt, live verifiziert                          | Breiter Core-Rollout plus Runtime-Recovery ueber internen Appwrite-Override live verifiziert                                 |
| 10     | erledigt                                            | Gruppen A bis E plus Rest-Follow-up sind committed; Root-`deno.lock` ist uebernommen, lokale Analyseartefakte sind ignoriert |
| 11     | erledigt                                            | Release-Gate und Rollback-Pfad sind dokumentiert                                                                             |

## Ziel

Dieses Dokument zerlegt die aktuelle Lage in klar abarbeitbare Tickets. Der Fokus liegt auf Stabilisierung, Wiederherstellung eines verlässlichen Entwicklungs- und Deploy-Zustands und erst danach auf sauberer Re-Integration der AI-Refactor-Arbeit.

## Ausgangslage

- Der aktuelle Workspace ist technisch `dirty` und enthält gleichzeitig lokale Änderungen an Frontend, Functions, Auth, Gateway, AI-Service und Deploy-Struktur.
- Der Branch `workspace-main-ai-20260406` enthält AI-bezogene Themen bereits in neuer Commit-Historie, während `feature/ai-service-refactor` dieselben Themen auf älterer Basis ebenfalls enthält.
- Die deployten Appwrite Functions sind nicht automatisch identisch mit dem lokalen Repo-Stand.
- Die Regression betrifft aktuell vor allem den Auth-/Transportpfad zwischen Frontend und Appwrite Functions.
- Konkrete Beobachtung:
  Am 2026-04-06 beantworteten dieselben Deployments `GET /projects` und `GET /worlds` noch mit `200`.
- Konkrete Beobachtung:
  Seit 2026-04-07 und 2026-04-08 liefern dieselben Deployments auf denselben Routen `401`.

## Architektur-Einschätzung

Die Lage ist nicht primär ein einzelner AI-Bug. Das Kernproblem ist eine inkonsistente Integration zwischen:

- Git-Historie
- lokalem Workspace
- deployten Functions
- Runtime-Auth-Verhalten

Das wichtigste Risiko ist aktuell nicht fehlende Funktionalität, sondern fehlende Eindeutigkeit über den gültigen technischen Vertrag zwischen Frontend und Functions.

## Arbeitsprinzipien

- Keine weiteren großen Merges in den aktuellen `dirty` Workspace.
- Erst Stabilisierung und Zustandsklärung, dann Re-Integration.
- Auth- und Transportpfad als eigenes Architekturthema behandeln, nicht als Nebeneffekt des AI-Refactors.
- Deployte Realität immer gegen lokalen Code und Git-Historie abgleichen.
- Jede Änderung muss einem klaren Ticket und einem klaren Zielzustand zugeordnet sein.

## Reihenfolge

1. Zustand sichern und inventarisieren.
2. Git- und Branch-Wahrheit herstellen.
3. Auth-/Transportvertrag entscheiden.
4. Basis-Reads wieder stabil machen.
5. Function-Auth konsistent ausrollen.
6. Deploy- und Env-Parität herstellen.
7. AI-Refactor kontrolliert re-integrieren.
8. Smoke-Tests und Release-Gates aufbauen.
9. Workspace bereinigen und in wartbaren Branch-Zustand überführen.

---

## Ticket 01: Workspace einfrieren und Ist-Zustand sichern

> Status 2026-04-09 17:27 CEST: Erledigt. Der Ist-Zustand ist in `docs/INTEGRATION_BEREINIGUNGSBASIS_2026-04-08.md` dokumentiert.

### Kontext

Der aktuelle Workspace enthält viele uncommitted Änderungen über mehrere Schichten hinweg. Ohne Sicherung besteht hohes Risiko, dass funktionierendes Verhalten oder wichtige Zwischenschritte verloren gehen.

### Problem

Es gibt aktuell keine saubere, gemeinsame Referenz für:

- den letzten funktionierenden lokalen Zustand
- den aktuellen problematischen Zustand
- den tatsächlich deployten Zustand

### Lösung

Vor jeder inhaltlichen Bereinigung wird der vollständige Ist-Zustand dokumentiert und technisch konserviert. Dazu gehören Git-Status, Diff-Statistik, relevante Branches, aktuelle Deployments, Function-Variablen, beobachtete Fehler und funktionierende User-Flows.

### User Journey

Ein Entwickler möchte an der Stabilisierung arbeiten, ohne versehentlich den einzigen Zustand zu verlieren, der bestimmte Features noch teilweise funktionsfähig hält.

### Akzeptanzkriterien

- Der aktuelle Workspace-Zustand ist vollständig dokumentiert.
- Es gibt einen nachvollziehbaren Snapshot der relevanten lokalen Änderungen.
- Die aktuell deployten Function-Deployments und Variablen sind protokolliert.
- Die bekannten funktionierenden und defekten Flows sind schriftlich festgehalten.

---

## Ticket 02: Branch- und Commit-Landkarte herstellen

> Status 2026-04-09 17:27 CEST: Erledigt. Die Branch-/Commit-Landkarte ist dokumentiert, und ein Blind-Merge von `feature/ai-service-refactor` ist ausgeschlossen.

### Kontext

`feature/ai-service-refactor` und `workspace-main-ai-20260406` enthalten inhaltlich ähnliche AI-Themen, aber auf unterschiedlichen Baselines und mit unterschiedlichen Commit-Hashes.

### Problem

Ein normaler Merge würde mit hoher Wahrscheinlichkeit doppelte oder widersprüchliche Integrationen erzeugen. Die eigentliche Frage ist nicht nur "was fehlt", sondern "welcher Commit ist fachlich bereits enthalten und in welcher Form".

### Lösung

Eine Commit-Landkarte wird erstellt, die die Themenblöcke aus `feature/ai-service-refactor`, `main` und `workspace-main-ai-20260406` gegenüberstellt. Ziel ist eine sachliche Zuordnung:

- bereits fachlich enthalten
- technisch abweichend erneut implementiert
- noch nicht übernommen
- lokal nur im Workspace vorhanden

### User Journey

Ein Entwickler möchte wissen, welche Änderungen aus dem AI-Branch wirklich noch integriert werden müssen und welche bereits in anderer Form im Arbeitsbranch stecken.

### Akzeptanzkriterien

- Es gibt eine Tabelle oder Liste der relevanten Themenblöcke pro Branch.
- Für jedes AI-Hauptthema ist klar, ob es bereits fachlich integriert ist.
- Es ist klar dokumentiert, dass kein Blind-Merge des alten Feature-Branches erfolgen soll.
- Es existiert eine belastbare Entscheidungsbasis für die spätere Re-Integration.

---

## Ticket 03: Auth-/Transportvertrag definieren

> Status 2026-04-09 17:27 CEST: Erledigt. Der dokumentierte Primaerpfad ist direkte Function-Domain mit `Authorization: Bearer <jwt>`.

### Kontext

Aktuell wurden zwei gekoppelte Architekturänderungen parallel angefasst:

- Frontend ruft Functions lokal über `createExecution` auf.
- Functions wurden lokal auf `requireUserBootstrap(req)` umgebaut, um neben `Authorization` auch Appwrite-Execution-Kontext zu akzeptieren.

### Problem

Die aktuellen `401` deuten darauf hin, dass der angenommene User-Kontext im neuen Transportpfad nicht stabil ankommt. Solange unklar ist, welcher Vertrag verbindlich gilt, sind Folgeänderungen hochriskant.

### Lösung

Ein verbindlicher technischer Vertrag wird definiert. Dabei muss bewusst entschieden werden, welcher Primärpfad offiziell unterstützt wird:

- Browser ruft Function-Domain direkt mit `Authorization: Bearer <jwt>` auf
- Browser ruft Appwrite `createExecution` auf und Functions lesen User-Kontext über Execution-Header

Sekundärpfade dürfen nur als klar definierte Fallbacks existieren.

### User Journey

Ein eingeloggter Nutzer öffnet Projekte oder Welten. Die Anfrage muss über einen wohldefinierten Pfad laufen, der in lokaler Entwicklung und auf der deployten Appwrite-Instanz gleich verstanden wird.

### Akzeptanzkriterien

- Es gibt eine dokumentierte Primärstrategie für authentifizierte Function-Calls.
- Es ist dokumentiert, welche Header oder Kontextquellen serverseitig erwartet werden.
- Es ist dokumentiert, welche Appwrite-Version und welches self-hosted Verhalten berücksichtigt werden müssen.
- Es gibt keinen impliziten Mischbetrieb mehr ohne klare Priorität.

---

## Ticket 04: Kritische Basis-Flows wiederherstellen

> Status 2026-04-09 17:27 CEST: Erledigt und live verifiziert. `/projects` und `/worlds` liefern wieder stabil `200`, Projects- und Worldbuilding-Seite sind nutzbar.

### Kontext

`/projects` und `/worlds` sind aktuell regressionsgefährdet. Diese Routen sind Basis-Flows für weite Teile der App.

### Problem

Solange Basis-Reads nicht stabil funktionieren, ist jede weitere Integration blind. AI-Arbeit, Detailseiten und Folgefeatures erzeugen dann nur Rauschen über einem kaputten Fundament.

### Lösung

Ein minimaler Stabilisierungsschritt stellt zuerst die Basis-Reads wieder her. Dieses Ticket darf nur den notwendigen Scope anfassen, um `Projects` und `Worldbuilding` verlässlich zu laden. Keine Nebenbaustellen, keine zusätzliche Refactor-Arbeit.

### User Journey

Ein eingeloggter Nutzer öffnet:

- die Projects-Seite
- die Worldbuilding-Seite

In beiden Fällen werden Listen ohne `401` geladen und die Seiten bleiben nutzbar.

### Akzeptanzkriterien

- `GET /projects` liefert für eingeloggte Nutzer stabil `200`.
- `GET /worlds` liefert für eingeloggte Nutzer stabil `200`.
- Die Projects-Seite lädt ohne Auth-Fehler.
- Die Worldbuilding-Seite lädt ohne Auth-Fehler.
- Die Wiederherstellung funktioniert lokal und auf der deployten Umgebung.

---

## Ticket 05: Function-Auth zentral härten und kompatibel ausrollen

> Status 2026-04-10 19:33 CEST: Erledigt und live verifiziert. Die zentrale Auth-Library bietet leichte User-Aufloesung plus vollen Bootstrap. `image`, `audio`, `video`, `gym` und `assistant` sind angebunden; `image`, `audio`, `gym`, `assistant` und `video` wurden live ueber den gemeinsamen Deploy-/Env-Pfad ausgerollt und per `smoke:feature-auth-rollout` erfolgreich geprueft.

### Kontext

Viele Function-Handler wurden lokal von `requireUserBootstrap(req.headers.authorization)` auf `requireUserBootstrap(req)` umgestellt. Das ist fachlich sinnvoll, aber nur dann, wenn der gemeinsame Auth-Adapter wirklich alle Laufzeitpfade robust abdeckt.

### Problem

Wenn die Shared-Auth-Schicht nicht rückwärts- und vorwärtskompatibel genug ist, kippen viele Endpunkte gleichzeitig. Das ist genau die Art von cross-cutting Änderung, die in einem dirty Workspace schnell unübersichtlich wird.

Ein zweites Risiko ist stilles Auseinanderlaufen der Feature-Services. `image`, `video`, `audio`, `assistant`, `projects` oder `worldbuilding` dürfen langfristig nicht mit separaten Auth-Systemen wachsen, die nur zufällig ähnlich aussehen. Sonst entstehen unterschiedliche Fehlerbilder, unterschiedliche Logs und unterschiedliche Randfälle.

### Lösung

Die Shared-Auth-Schicht wird als eigenständige Komponente behandelt und gezielt stabilisiert. Ziel ist eine zentrale Auth-Library mit klaren Stufen statt mehrerer unabhängiger Adapter:

- eine leichte Stufe fuer reine User-Aufloesung
- eine volle Stufe fuer User- plus Bootstrap-/Org-/Membership-Kontext

Die leichte Stufe loest nur den authentifizierten User aus erlaubten Quellen auf. Sie ist fuer schlanke oder hochfrequente Services wie `image`, `video` oder `audio` gedacht.

Die volle Stufe baut auf derselben zentralen Library auf und erweitert sie um den zusaetzlichen Kontext, den komplexere Flows wie `assistant`, `projects` oder `worldbuilding` brauchen.

Wichtig ist nicht, dass jeder Handler denselben schweren Bootstrap macht. Wichtig ist, dass alle Handler denselben Auth-Vertrag und dieselbe zentrale Auth-Library verwenden.

### User Journey

Ein Nutzer verwendet verschiedene App-Bereiche wie Profile, Beats, Conversations, Projects, Worldbuilding, Image-, Video- oder Audio-Funktionen. Unabhaengig vom jeweiligen Handler funktioniert die Nutzererkennung ueberall gleich, auch wenn manche Features nur die leichte Auth-Stufe und andere den vollen Bootstrap benoetigen.

### Akzeptanzkriterien

- Alle relevanten Handler verwenden dieselbe zentrale Auth-Library.
- Die zentrale Auth-Library bietet mindestens eine leichte User-Aufloesung und einen vollen Bootstrap-Pfad.
- `image`, `video`, `audio` und `assistant` nutzen keinen separaten proprietaeren Auth-Adapter ausserhalb dieser Library mehr.
- Der Auth-Vertrag verarbeitet dokumentierte Quellen konsistent.
- Auth-Fehler lassen sich in Logs eindeutig zuordnen.

### Verifizierter Live-Schnitt 2026-04-10

- `scriptony-image` Deployment `69d9092ec368201a9d5e`
- `scriptony-audio` Deployment `69d9038c942234c1e3c9`
- `scriptony-gym` Deployment `69d9038c3a4165198656`
- `scriptony-assistant` Deployment `69d93317c7d9d5a1ec51`
- `scriptony-video` Deployment `69d9333745f110d7a990`
- `npm run smoke:feature-auth-rollout` gruen (`5/5`)
- `video_history` ist ueber eine User-JWT-authentifizierte Appwrite-Execution verifiziert, weil fuer `scriptony-video` derzeit keine aktive Browser-Domain in `VITE_BACKEND_FUNCTION_DOMAIN_MAP` genutzt wird.
- Neuer gemeinsamer Deploy-Pfad:
  - Server-SDK statt `appwrite-cli`-Login
  - Server-Env-Sync pro Function vor dem Deployment
  - eigener Live-Smoke fuer den vollstaendigen Feature-Scope

---

## Ticket 06: Deploy- und Env-Parität herstellen

> Status 2026-04-09 17:27 CEST: Erledigt und live verifiziert. Deployment-/Env-Paritaet ist dokumentiert und mit Auth-Smokes pruefbar.

### Kontext

Das Repo, die lokale `.env`, die in Appwrite hinterlegten Function-Variablen und die aktiven Deployments sind getrennte Wahrheiten. Der bisherige `/health`-Check zeigt nur Teilwahrheiten.

### Problem

Eine grüne Health-Route beweist nicht, dass authentifizierte App-Flows funktionieren. Ohne Paritätsprüfung zwischen lokalem Code und deployter Runtime bleibt jede Fehlersuche teuer und fehleranfällig.

### Lösung

Es wird ein klarer Paritäts-Check definiert:

- welcher lokale Commit ist relevant
- welche Deployments sind live
- welche Function-Variablen sind gesetzt
- welche Domains zeigen auf welche Deployments
- welche Auth-geschützten Smoke-Routen funktionieren tatsächlich

### User Journey

Ein Entwickler möchte nach einem Deploy sicher sagen können, dass lokal, Git und Appwrite dieselbe technische Realität meinen.

### Akzeptanzkriterien

- Für jede relevante Function ist Deployment-ID und Aktivstatus dokumentiert.
- Für jede relevante Function sind kritische Variablen und Domains dokumentiert.
- Es gibt mindestens einen Auth-geschützten Smoke-Check pro kritischem Service.
- `Health` und `realer auth-geschützter Flow` werden getrennt geprüft.

---

## Ticket 07: AI-Refactor kontrolliert re-integrieren

> Status 2026-04-09 17:27 CEST: Fuer den aktuellen Kernscope erledigt und live verifiziert. `/ai/*` ist ueber `scriptony-ai` reintegriert, und `/ai/settings`, `/ai/conversations` sowie `/settings` sind live gruen.

### Kontext

Der AI-Refactor ist real und wertvoll, aber er liegt aktuell auf historisch anderer Basis vor und ist teilweise bereits neu in den Arbeitsbranch eingeflossen.

### Problem

Ein unkontrollierter Merge würde Architektur- und Integrationsrisiken verschärfen:

- doppelte Logik
- widersprüchliche Implementationen
- verdeckte Konflikte in Shared-Code
- unklare Deploy-Reihenfolge

### Lösung

Die AI-Arbeit wird nicht als kompletter Branch gemerged, sondern thematisch re-integriert. Für jeden AI-Block wird entschieden:

- bereits vorhanden, nur konsolidieren
- fehlt noch, sauber übernehmen
- lokal abweichend, gezielt neu implementieren
- vorerst nicht übernehmen

### User Journey

Ein Nutzer möchte AI-Konfiguration, Assistant, Image- oder Audio-bezogene Features nutzen, ohne dass dadurch Basisfunktionen oder Auth-Verhalten wieder brechen.

### Akzeptanzkriterien

- AI-Änderungen sind thematisch statt pauschal integriert.
- Jeder übernommene AI-Block hat eine klare Quelle und Begründung.
- AI-Features bauen auf stabiler Basis aus Tickets 03 bis 06 auf.
- Nach der Re-Integration bleiben Basis-Reads und Auth-Flows stabil.

---

## Ticket 08: Smoke-Test-Matrix für reale User-Flows aufbauen

> Status 2026-04-09 17:27 CEST: Erledigt und live verifiziert. Die Matrix steht, ist lokal sowie gegen live anwendbar und aktuell `6/6` gruen.

### Kontext

Der bisherige Zustand zeigt, dass reine Health-Checks und lose Console-Logs nicht ausreichen, um Integrationsbrüche früh zu erkennen.

### Problem

Es fehlen verbindliche Smoke-Tests auf User-Journey-Ebene, vor allem für authentifizierte Flows und cross-service Übergänge.

### Lösung

Eine kleine, feste Smoke-Test-Matrix wird definiert und vor jedem relevanten Deploy ausgeführt. Sie muss nicht groß sein, aber die kritischen Wege abdecken.

### User Journey

Ein Entwickler oder Reviewer möchte mit wenigen Checks sicher sein, dass die App nicht nur "läuft", sondern für einen echten Nutzer funktional ist.

### Akzeptanzkriterien

- Es gibt eine definierte Liste kritischer Smoke-Flows.
- Auth-geschützte Flows sind Teil der Matrix.
- Projects und Worldbuilding sind Teil der Matrix.
- Mindestens ein AI-bezogener Flow ist Teil der Matrix.
- Die Matrix ist lokal und gegen deployte Umgebung anwendbar.

---

## Ticket 09: Logs, Fehlermeldungen und Observability bereinigen

> Status 2026-04-09 20:46 CEST: Lokal umgesetzt und verifiziert. Frontend-Gateway und API-Client unterscheiden jetzt `transport`, `function-auth` und `function-response`. Shared-Function-Responses tragen jetzt Error-Codes wie `AUTH_UNAUTHORIZED`, `UPSTREAM_FETCH_FAILED` oder `UPSTREAM_REQUEST_TERMINATED`. Frontend-Typecheck und repräsentative Function-Builds sind grün. Ein breiter Live-Rollout der neuen Function-Logs über alle betroffenen Deployments ist noch offen, ist aber kein akuter Produktblocker.

### Kontext

Aktuell ist mindestens eine Fehlermeldung fachlich irreführend: Ein Function-Response-Fehler wird als `createExecution failed` geloggt, obwohl die Execution selbst bereits stattgefunden hat.

### Problem

Irreführende Logs verlängern Fehlersuche und erzeugen falsche Hypothesen. In einer verteilten Architektur ist das ein ernstes Produktivitätsproblem.

### Lösung

Die kritischen Logs und Fehlermeldungen werden auf Ursachebene getrennt:

- Execution konnte nicht gestartet werden
- Execution lief, aber Function antwortete mit Fehler
- Function lief, aber User-Kontext fehlte
- Network-/Domain-/CORS-Fehler

### User Journey

Ein Entwickler sieht einen Fehler in Browser oder Logs und kann innerhalb weniger Minuten den richtigen Systembereich identifizieren.

### Akzeptanzkriterien

- Frontend-Logs unterscheiden Transport-, Execution- und Function-Fehler.
- Auth-bezogene Fehler sind als solche erkennbar.
- Kritische Fehlermeldungen verweisen nicht auf den falschen Layer.
- Die Logs sind für lokale Entwicklung und deployte Analyse nutzbar.

---

## Ticket 10: Workspace bereinigen und in wartbaren Branch-Zustand überführen

> Status 2026-04-09 22:36 CEST: Erledigt. Der aktuelle Dirty-Workspace ist in commitbare Cluster zerlegt und als Gruppen A bis E plus Rest-Follow-up committed. Das Root-`deno.lock` wurde bewusst uebernommen, weil `package.json` einen echten `deno`-Testpfad besitzt. `functions/deno.lock` sowie `repo-visualization*.html` sind als lokale bzw. redundante Artefakte aus dem normalen Arbeitszustand herausgenommen. Der naechste operative Schritt liegt damit bei Ticket 11 bzw. beim eigentlichen Release.

### Kontext

Selbst wenn die technischen Probleme gelöst sind, bleibt ein dirty Workspace mit vermischten Themen ein dauerhaftes Risiko.

### Problem

Ohne saubere Branch- und Commit-Struktur wird die nächste Integrationsrunde dieselben Probleme wiederholen.

### Lösung

Nach der Stabilisierung wird der Workspace in klar getrennte, reviewbare Einheiten überführt. Ziel ist nicht Perfektion, sondern wartbare Struktur.

### User Journey

Ein Entwickler möchte nach der Bereinigung wieder normal arbeiten können, ohne bei jeder Änderung Angst vor versteckten Seiteneffekten zu haben.

### Akzeptanzkriterien

- Es gibt einen sauberen Integrationsbranch mit nachvollziehbarer Commit-Struktur.
- Temporäre Experimente und echte Produktänderungen sind getrennt.
- Nicht übernommene Altstände sind dokumentiert oder archiviert.
- Ein Reviewer kann die Änderungen thematisch statt chaotisch nachvollziehen.

---

## Ticket 11: Release-Gate und Rollback-Plan definieren

> Status 2026-04-09 22:36 CEST: Erledigt. Das Release-Gate und der Rollback-Pfad sind in `docs/RELEASE_GATE_ROLLBACK_2026-04-09.md` dokumentiert.

### Kontext

Wenn Auth, Functions und AI gleichzeitig verändert werden, reicht "Deploy und hoffen" nicht.

### Problem

Ohne klaren Rollback-Plan kann ein technisch plausibler Integrationsschritt produktiv zu lange schaden.

### Lösung

Vor dem finalen Zusammenführen wird ein einfaches Release-Gate definiert:

- was muss vor Merge grün sein
- was muss vor Deploy grün sein
- wie wird auf den letzten stabilen Stand zurückgerollt

### User Journey

Ein Verantwortlicher möchte einen Integrationsschritt freigeben, ohne die Plattform in einen unklaren Zwischenzustand zu schicken.

### Akzeptanzkriterien

- Es gibt klare Freigabekriterien vor Merge.
- Es gibt klare Freigabekriterien vor Deploy.
- Es gibt einen dokumentierten Rückfallpfad auf den letzten stabilen Stand.
- Rollback ist nicht nur theoretisch, sondern anhand realer Deployments nachvollziehbar.

---

## Empfohlener Start

Wenn die Arbeit spaeter wieder aufgenommen wird, ist die operative Hauptarbeit abgeschlossen. Ticket 01 bis 11 sind fuer den aktuellen Kernscope dokumentiert. Das Gate ist live gruen, und `integration-main-plus-ai-20260406` steht bereits auf dem validierten Stand. Offen bleibt nur noch die ausdrueckliche Freigabe oder ein spaeterer Merge nach `main`.
