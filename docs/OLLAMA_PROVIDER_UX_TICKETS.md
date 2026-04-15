# Ollama Provider UX Umbau

Stand: 2026-04-11

## Aktueller Status

- Ticket 01: erledigt
- Ticket 02: erledigt
- Ticket 03: erledigt
- Ticket 04: erledigt
- Ticket 05: erledigt — Key-Management in FeatureProviderCard, Validate/Discovery via ai-service
- Ticket 06: erledigt — `inferOllamaModeForFeature()`, Migration-Script `migrate-ollama-provider-ids.mjs`
- Ticket 07: erledigt — 117 Vitest-Tests (Allowlist + Hook + Card + Smoke + Backend-Normalisierung + Model-Discovery)

## Zielbild

In den Feature-Karten fuer `assistant`, `video`, `bild`, `audio` und `gym` soll der Provider-Dropdown fuer Ollama nur noch einen Eintrag zeigen:

- `Ollama`

Wenn `Ollama` gewaehlt ist, erscheint darunter ein Modus-Umschalter:

- `Lokal`
- `Cloud`

Zusaetzlich soll die Provider-Auswahl einen sichtbaren Status bekommen:

- gruener `Active`-Badge, wenn der Provider fuer dieses Feature betriebsbereit konfiguriert ist

Fuer klassische API-Key-Provider bedeutet das:

- ein gueltiger gespeicherter Key fuer genau dieses Feature

Fuer Ollama bedeutet das:

- `Cloud`: gespeicherter Key fuer genau dieses Feature
- `Lokal`: lokale Verbindung ist fuer dieses Feature konfiguriert und validierbar

## Umsetzungsreihenfolge

1. Ticket 01: UX-Vertrag und Zustandsmodell festziehen
2. Ticket 02: Dropdown in der Integrations-UI auf kanonisches `Ollama` umstellen
3. Ticket 03: Ollama-Modus pro Feature-Karte sauber verdrahten
4. Ticket 04: Active-Badges in Trigger und Dropdown einfuehren
5. Ticket 05: Save-/Validate-/Model-Discovery fuer Ollama-Modi korrigieren
6. Ticket 06: Legacy-Kompatibilitaet fuer bestehende `ollama_local` / `ollama_cloud`-Daten
7. Ticket 07: Smoke-Tests und UI-Regressionen fuer alle Feature-Bereiche

---

## Ticket 01 - UX-Vertrag und Zustandsmodell

**Kontext**

Die aktuelle Integrations-UI behandelt `ollama`, `ollama_local` und `ollama_cloud` als drei verschiedene Provider. Das passt weder zur gewuenschten UX noch zu einem klaren mentalen Modell.

**Problem**

- Der Nutzer sieht mehrfach denselben Anbieter im Dropdown.
- Die eigentliche Entscheidung ist nicht "welcher Provider?", sondern bei Ollama "welcher Modus?".
- Statusanzeigen fuer konfigurierte Provider sind im Dropdown heute nicht sichtbar.

**Loesung**

Ein verbindliches UI-Vertragsmodell definieren:

- Dropdown zeigt nur noch kanonische Provider
- `ollama_local` und `ollama_cloud` werden im UI zu `Ollama` zusammengefuehrt
- der Modus wird separat ueber einen Toggle gesteuert
- der `Active`-Status wird pro Feature-Slot ausgewiesen

**User Journey**

1. Der Nutzer oeffnet eine Feature-Karte, zum Beispiel `Assistant Chat`.
2. Im Provider-Dropdown sieht er nur noch einen Eintrag `Ollama`.
3. Nach Auswahl von `Ollama` kann er direkt zwischen `Lokal` und `Cloud` wechseln.
4. Er erkennt schon in der Auswahl, ob der Slot einsatzbereit ist.

**Akzeptanzkriterien**

- Es gibt ein dokumentiertes UI-Zielbild fuer Ollama.
- Die Begriffe `Provider`, `Modus` und `Active` sind fachlich eindeutig definiert.
- Das Zielbild gilt einheitlich fuer `assistant`, `video`, `bild`, `audio` und `gym`.

---

## Ticket 02 - Dropdown auf kanonisches Ollama umstellen

**Kontext**

Die Integrations-UI rendert ihre Providerliste aktuell direkt aus den Backend-Provider-IDs und zeigt dadurch mehrere Ollama-Varianten an.

**Problem**

- Das Dropdown ist redundant.
- Alte Backend-IDs leaken direkt in die UI.
- Der Nutzer muss Implementierungsdetails verstehen, die fuer die Bedienung irrelevant sind.

**Loesung**

In der UI eine kanonische Providerliste erzeugen:

- `ollama_local` und `ollama_cloud` werden beim Rendern zu einem einzigen Eintrag `ollama` zusammengefuehrt
- die Anzeige in Badge, Trigger und Auswahl verwendet nur noch den Namen `Ollama`
- die restlichen Provider bleiben unveraendert

**User Journey**

1. Der Nutzer oeffnet den Provider-Dropdown.
2. Er sieht `OpenAI`, `Anthropic`, `OpenRouter`, `Ollama` usw.
3. Er sieht nicht mehr `Ollama (lokal)` und `Ollama (Cloud)` als getrennte technische Varianten.

**Akzeptanzkriterien**

- Im Dropdown erscheint pro Feature-Karte nur noch ein Ollama-Eintrag.
- Die Karten fuer `assistant`, `video`, `bild`, `audio` und `gym` nutzen dieselbe kanonische Darstellung.
- Bestehende nicht-Ollama-Provider bleiben sichtbar und unveraendert bedienbar.

---

## Ticket 03 - Modus-Umschalter fuer Ollama pro Feature-Karte

**Kontext**

Nachdem Ollama im Dropdown nur noch einmal dargestellt wird, braucht die UI einen klaren Ort fuer die Unterscheidung zwischen lokal und Cloud.

**Problem**

- Ohne separaten Modus-Umschalter geht die Information verloren, wie Ollama fuer ein Feature betrieben werden soll.
- Der Nutzer kann nicht mehr explizit zwischen lokalem Ollama und Ollama Cloud wechseln.

**Loesung**

Unterhalb des Provider-Feldes einen Toggle-Switch fuer `Lokal` und `Cloud` einfuehren:

- sichtbar nur, wenn `Ollama` der aktive Provider fuer das Feature ist
- Schalter wirkt pro Feature-Karte
- der Umschalter bestimmt intern den effektiven Runtime-Pfad fuer Save, Validate und Model Discovery

**User Journey**

1. Der Nutzer waehlt `Ollama`.
2. Darunter erscheint ein Umschalter `Lokal | Cloud`.
3. Bei `Lokal` sieht er die Base-URL.
4. Bei `Cloud` sieht er das Key-Feld fuer diesen Feature-Slot.

**Akzeptanzkriterien**

- `Ollama` zeigt pro Feature-Karte einen sichtbaren Modus-Umschalter.
- `Lokal` und `Cloud` wechseln die relevanten Eingabefelder korrekt um.
- Ein Wechsel des Modus loescht nicht stillschweigend das gewaehlte Modell oder andere Feature-Daten.

---

## Ticket 04 - Active-Badges in Dropdown und Trigger

**Kontext**

Der Nutzer soll direkt in der Provider-Auswahl sehen koennen, ob ein Provider fuer das aktuelle Feature bereits einsatzbereit ist.

**Problem**

- Der Konfigurationsstatus ist heute nur indirekt sichtbar.
- Im Dropdown ist nicht erkennbar, welche Provider fuer dieses Feature bereits nutzbar sind.

**Loesung**

Provider-Status im UI sichtbar machen:

- gruener `Active`-Badge in der Dropdown-Liste
- gruener `Active`-Badge auch im Select-Trigger fuer den aktuell gewaehlten Provider
- Statuslogik pro Feature-Slot statt global

Statusregeln:

- klassische API-Key-Provider: `Active`, wenn fuer `feature::provider` ein Key gespeichert ist
- `Ollama Cloud`: `Active`, wenn fuer den effektiven Cloud-Slot ein Key gespeichert ist
- `Ollama Lokal`: `Active`, wenn lokale Verbindung konfiguriert und validierbar ist

**User Journey**

1. Der Nutzer klappt das Dropdown einer Feature-Karte auf.
2. Er sieht direkt, welche Provider bereits `Active` sind.
3. Waehlt er einen bereits aktiven Provider, sieht er den Status auch im geschlossenen Feld.

**Akzeptanzkriterien**

- Im Dropdown erscheinen gruen markierte `Active`-Badges.
- Der Badge bezieht sich immer auf den aktuellen Feature-Slot.
- Der aktive Provider zeigt seinen Status auch im geschlossenen Select an.

---

## Ticket 05 - Save, Validate und Model Discovery fuer Ollama-Modi korrigieren

**Kontext**

Die aktuelle Integrations-UI nutzt unterschiedliche Save- und Validate-Pfade fuer Provider-Keys und fuer Ollama-URLs. Nach dem UX-Umbau muss dieses Verhalten zum neuen Toggle passen.

**Problem**

- `Ollama Cloud` braucht einen Key, darf aber nicht mehr wie ein separater Provider im Dropdown auftreten.
- `Ollama Lokal` braucht keine Cloud-Credentials, aber eine funktionierende lokale URL.
- Model Discovery und Validate muessen den gewaehlten Modus beruecksichtigen.

**Loesung**

Die Integrations-UI und die Request-Payloads pro Modus angleichen:

- `Ollama Lokal`
  - Base-URL verwenden
  - kein Pflicht-Key
  - Validate und Discover gegen die lokale URL ausfuehren
- `Ollama Cloud`
  - Key fuer den Feature-Slot speichern
  - Discover und Validate mit Cloud-Host plus Key ausfuehren

Intern darf waehrend der Migration weiter auf bestehende Runtime-Pfade gemappt werden, solange die UI nur noch `Ollama` zeigt.

**User Journey**

1. Der Nutzer waehlt `Ollama`.
2. Er stellt auf `Cloud` und speichert einen Key.
3. Danach kann er Modelle pruefen und ein Modell auswaehlen.
4. Alternativ stellt er auf `Lokal`, setzt seine lokale URL und prueft die Verbindung.

**Akzeptanzkriterien**

- [x] Save funktioniert fuer `Ollama Cloud` mit Key pro Feature.
- [x] Save funktioniert fuer `Ollama Lokal` ohne Cloud-Key.
- [x] Validate und Model Discovery verwenden den gewaehlten Modus korrekt.
- [x] Die bisherige Funktionalitaet fuer andere Provider bleibt unveraendert.

---

## Ticket 06 - Legacy-Kompatibilitaet fuer bestehende Daten

**Kontext**

In vorhandenen Daten koennen noch `ollama_local`, `ollama_cloud` oder altes `ollama` gespeichert sein.

**Problem**

- Ohne Normalisierung kann die neue UI alte Konfigurationen falsch anzeigen.
- Ein bereits gespeichertes Setup duerfte nach dem Umbau nicht ploetzlich unbedienbar werden.

**Loesung**

Beim Laden und Anzeigen alte Werte normalisieren:

- `ollama_local` -> UI zeigt `Ollama` + Modus `Lokal`
- `ollama_cloud` -> UI zeigt `Ollama` + Modus `Cloud`
- altes `ollama` wird anhand vorhandener Konfiguration sinnvoll aufgelost oder mit einem klaren Default geladen

Beim Speichern bleibt waehrend der Migration Backend-Kompatibilitaet erhalten.

**User Journey**

1. Ein bestehender Nutzer oeffnet die Integrations-Seite.
2. Sein bisheriges Ollama-Setup wird korrekt dargestellt.
3. Er muss seine Konfiguration nicht neu anlegen.

**Akzeptanzkriterien**

- [x] Bestehende Ollama-Konfigurationen werden ohne Datenverlust geladen.
- [x] Alte gespeicherte Werte fuehren nicht zu einem leeren oder kaputten Dropdown.
- [x] Der Nutzer kann alte Konfigurationen direkt weiterbearbeiten.

---

## Ticket 07 - QA und Smoke-Tests fuer alle Feature-Bereiche

**Kontext**

Die Aenderung betrifft denselben UI-Mechanismus fuer mehrere Feature-Karten und damit mehrere Save-/Validate-Pfade.

**Problem**

- Ein partiell funktionierender Umbau reicht hier nicht.
- Fehler in einem Feature koennen trotz sauberer UI in anderen Bereichen unentdeckt bleiben.

**Loesung**

Eine gezielte QA-Matrix fuer den Umbau fahren:

- `assistant`
- `video`
- `bild`
- `audio`
- `gym`

Zu pruefen:

- Dropdown zeigt nur ein `Ollama`
- Toggle `Lokal | Cloud` funktioniert
- `Active`-Badge erscheint korrekt
- Modellpruefung und Speichern funktionieren
- bestehende Nicht-Ollama-Provider regressieren nicht

**User Journey**

1. Der Nutzer arbeitet jede Feature-Karte einmal durch.
2. Er kann `Ollama` waehlen, den Modus umschalten und speichern.
3. Er erkennt sofort den Konfigurationsstatus.
4. Andere Provider funktionieren weiter wie bisher.

**Akzeptanzkriterien**

- [x] Alle fuenf Feature-Bereiche verwenden denselben Ollama-UX-Flow.
- [x] Keine doppelten Ollama-Eintraege mehr im Dropdown.
- [x] Active-Badges verhalten sich konsistent.
- [x] Keine Regression bei OpenAI, OpenRouter, Anthropic, Google, DeepSeek, ElevenLabs oder HuggingFace.
