# Supabase → Nhost Datenmigration

Alle angelegten Projekte (und zugehörigen Daten) lagen bisher in Supabase. Damit sie in Nhost genutzt werden können, müssen die Daten einmalig von Supabase nach Nhost überführt werden.

## Überblick

- **Quelle:** Supabase (PostgreSQL + Auth)
- **Ziel:** Nhost (Hasura/GraphQL + Auth)
- **Kernproblem:** User-IDs sind in Supabase und Nhost unterschiedlich. Jeder Nutzer muss sich in Nhost anmelden (oder ist schon angemeldet); die Zuordnung „alter Supabase-User“ → „neuer Nhost-User“ erfolgt per **E-Mail** (gleiche E-Mail = derselbe Nutzer).

## Option A: Migrationsskript (empfohlen)

Ein Node-Skript liest alle relevanten Daten aus Supabase (mit Service-Role-Key), mappt User-IDs per E-Mail auf Nhost-User-IDs und schreibt die Daten per Hasura-GraphQL (Admin-Secret) nach Nhost.

### Voraussetzungen

1. **Supabase**
   - Projekt-URL und **Service Role Key** (nicht Anon Key):  
     [Supabase Dashboard](https://supabase.com/dashboard) → Projekt → Settings → API → `service_role` (secret).
   - Nutzer müssen in Supabase unter Authentication → Users existieren (E-Mail sichtbar).

2. **Nhost**
   - Nutzer müssen in Nhost angelegt sein (gleiche E-Mail wie in Supabase empfohlen).
   - **GraphQL-URL** und **Hasura Admin Secret**:  
     Nhost Dashboard → Projekt → Settings → API, bzw. Env in den Nhost Functions.

3. **User-Mapping**
   - Das Skript erwartet eine JSON-Datei, die jede Supabase-User-ID auf eine Nhost-User-ID abbildet (siehe unten „User-Mapping erzeugen“).

### User-Mapping erzeugen

1. **Supabase-User exportieren (E-Mail + ID)**  
   ```bash
   SUPABASE_URL=https://dein-projekt.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/export-supabase-users.js
   ```  
   Das gibt eine JSON-Liste `[{ "id": "...", "email": "..." }, ...]` aus. Oder manuell: Supabase Dashboard → Authentication → Users → id/email notieren.

2. **Nhost-User ermitteln**  
   Nhost Dashboard → Authentication → Users: Für jede E-Mail die entsprechende User-ID (UUID) notieren.

3. **Mapping-Datei anlegen**  
   Datei z. B. `scripts/user-id-mapping.json`:

   Siehe Vorlage: `scripts/user-id-mapping.json.example`. Kopiere sie nach `scripts/user-id-mapping.json` und ersetze die UUIDs:

   ```json
   {
     "alte-supabase-uuid-1": "neue-nhost-uuid-1",
     "alte-supabase-uuid-2": "neue-nhost-uuid-2"
   }
   ```

   Jede Supabase-User-ID (Key) wird beim Import durch die zugehörige Nhost-User-ID (Value) ersetzt.

### Secrets / Umgebungsvariablen (wie bei Supabase)

Die Skripte lesen Umgebungsvariablen. Du musst sie **nicht** mehr manuell in der Shell setzen – es gibt zwei Wege:

**1. Lokale Datei (empfohlen für lokale Ausführung)**  
Analog zu Supabase: Werte in eine Datei legen, die **nicht** ins Repo kommt.

- Erstelle im Projektroot (oder in `scripts/`) eine Datei **`.env.migration`** oder **`.env`**.
- Vorlage: `scripts/.env.migration.example` (kopieren, umbenennen, Werte eintragen).
- Die Migrationsskripte laden automatisch `.env.migration` bzw. `.env` (Reihenfolge: Projektroot, dann `scripts/`). Bereits gesetzte Env-Variablen werden **nicht** überschrieben.
- `.env` und `.env.migration` stehen in `.gitignore` – **niemals committen**.

**2. GitHub Secrets (für Migration in GitHub Actions)**  
Wenn du die Migration per GitHub Actions laufen lassen willst:

- Im Repo: **Settings → Secrets and variables → Actions** die folgenden **Repository Secrets** anlegen:
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `NHOST_GRAPHQL_URL`, `NHOST_ADMIN_SECRET`
  - `USER_ID_MAPPING_JSON` (einzelner JSON-String, z. B. `{"uuid-supabase-1":"uuid-nhost-1"}`)
  - Für Storage-Migration zusätzlich: `NHOST_STORAGE_URL`
- Workflow **„Migrate Supabase to Nhost“** unter **Actions** manuell starten („Run workflow“), Optionen: DB nur / Storage nur / Dry run.

Details siehe `.github/workflows/migrate-supabase-to-nhost.yml`.

### Ablauf (Skript)

1. Umgebungsvariablen wie oben (lokal: `.env.migration` / `.env`; oder Export in der Shell):
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `NHOST_GRAPHQL_URL`, `NHOST_ADMIN_SECRET`
   - Optional Storage: `NHOST_STORAGE_URL`

2. User-Mapping bereitstellen:
   - **Lokal:** Datei `USER_ID_MAPPING_PATH` (z. B. `scripts/user-id-mapping.json`) **oder**
   - **GitHub Actions:** Secret `USER_ID_MAPPING_JSON` mit dem kompletten JSON-Inhalt.

3. DB-Migration ausführen:
   ```bash
   cd Scriptonyapp
   node scripts/migrate-supabase-to-nhost.js
   ```
   Optional zuerst: `node scripts/migrate-supabase-to-nhost.js --dry-run` (nur Lesen aus Supabase, kein Schreiben nach Nhost).

4. **(Optional) Storage-Migration:** Wenn Cover-Bilder, Shot-Bilder und Audio-Dateien mit übernommen werden sollen, danach das Skript **Storage-Migration** ausführen (siehe Abschnitt unten).

5. Das DB-Skript:
   - liest Organisationen, Projekte, Welten, Nodes, Shots, Characters, etc. aus Supabase,
   - ersetzt jede `owner_id` und `user_id` durch die gemappte Nhost-User-ID,
   - schreibt die Daten in der richtigen Reihenfolge (FK-Reihenfolge) nach Nhost.

### Wichtige Hinweise

- **Einmal ausführen:** Das Skript ist für einen einmaligen Lauf gedacht. Bei erneuter Ausführung können Unique-Constraint-Fehler auftreten (IDs existieren bereits). Bei Bedarf zuerst in Nhost die betroffenen Tabellen leeren (nur Daten, nicht Schema).
- **IDs bleiben erhalten:** Organisation-, Projekt-, World-, Shot-IDs etc. werden nicht geändert; nur User-Referenzen werden gemappt. So bleiben Beziehungen unter den Daten konsistent.
- **Storage (Bilder/Audio):** Siehe Abschnitt **Storage-Migration** unten – ein zweites Skript kopiert alle Dateien von Supabase Storage nach Nhost und aktualisiert die URLs in der DB.
- **Einmalig:** Die Migration soll einmal pro Supabase-Projekt laufen. Danach arbeitet die App nur noch mit Nhost.

### Storage-Migration (Cover-Bilder, Shot-Bilder, Audio)

**Nach** der DB-Migration (Schritt 3 oben) kannst du alle Dateien aus Supabase Storage nach Nhost kopieren und die gespeicherten URLs in Nhost aktualisieren.

1. **Voraussetzungen**
   - DB-Migration wurde bereits ausgeführt (Nhost enthält die Zeilen, noch mit Supabase-URLs in `cover_image_url`, `image_url`, `file_url` usw.).
   - In Nhost müssen die gleichen Storage-Buckets existieren (oder werden bei Bedarf angelegt). Verwendete Bucket-IDs: `make-3b52693b-project-images`, `make-3b52693b-world-images`, `make-3b52693b-shots`, `make-3b52693b-audio-files`.

2. **Umgebungsvariablen**
   - Alle wie bei der DB-Migration, zusätzlich:
   - `NHOST_STORAGE_URL` (z. B. `https://mthatsgmfklegprnulnn.eu-central-1.nhost.run/v1/storage` – aus Nhost Dashboard → Settings → API → Storage URL).

3. **Ablauf**
   ```bash
   node scripts/migrate-supabase-storage-to-nhost.js
   ```
   Optional zuerst nur prüfen (kein Download/Upload/Update):
   ```bash
   node scripts/migrate-supabase-storage-to-nhost.js --dry-run
   ```

4. **Was das Skript macht**
   - Liest aus Nhost alle Zeilen, in denen eine der URL-Spalten noch eine Supabase-Storage-URL enthält (z. B. `projects.cover_image_url`, `worlds.cover_image_url`, `shots.image_url`, `shot_audio.file_url`, `characters.avatar_url`/`image_url`, `world_items.image_url`, `scenes.keyframe_image_url`, `project_inspirations.image_url`).
   - Lädt jede Datei von Supabase herunter (mit Service-Role-Key, auch bei privaten Buckets).
   - Lädt sie in den passenden Nhost-Bucket hoch und holt die neue (Presigned-)URL.
   - Aktualisiert die Zeile in Nhost mit der neuen URL.

5. **Hinweise**
   - Presigned-URLs von Nhost können ablaufen. In den Nhost-Bucket-Einstellungen kann die **download_expiration** erhöht werden. Alternativ müsste die App später so umgebaut werden, dass sie bei Anzeige eine frische Presigned-URL per File-ID anfordert.
   - Fehler bei einzelnen Dateien (z. B. 404 in Supabase) werden geloggt; das Skript läuft für die übrigen Einträge weiter.

## Option B: Manuell (SQL Export/Import)

1. In Supabase: SQL Editor oder `pg_dump` – Export der öffentlichen Tabellen (ohne `auth.users`).
2. In den exportierten SQL-Dateien alle Vorkommen von Supabase-User-IDs durch die entsprechenden Nhost-User-IDs ersetzen (z. B. mit einem Editor/Skript).
3. Schema in Nhost ist bereits angelegt (über Nhost-Migrationen). Nur Daten-INSERTs ausführen – am besten in der gleichen Reihenfolge wie beim Migrationsskript (Organisationen → Members → Worlds → Projects → …).
4. Auth-User müssen in Nhost separat angelegt sein (Registrierung mit gleicher E-Mail).

Diese Option ist fehleranfälliger (FK-Reihenfolge, Trigger, RLS) und wird nur empfohlen, wenn das Skript nicht genutzt werden kann.

## Tabellen (Reihenfolge für Import)

Abhängigkeiten beachten; ungefähre Reihenfolge:

1. `organizations` (owner_id mappen)
2. `organization_members` (user_id, organization_id mappen – org_id bleibt)
3. `worlds` (organization_id bleibt)
4. `world_categories`, `world_items`
5. `projects` (organization_id, world_id, user_id mappen)
6. `episodes`
7. `characters` (user_id mappen)
8. `scenes`, `scene_characters`
9. `timeline_nodes` (user_id mappen)
10. `shots` (user_id mappen), `shot_audio`
11. `story_beats` (user_id mappen), ggf. weitere Tabellen

## Nach der Migration

- App mit Nhost-Backend (`VITE_BACKEND_PROVIDER=nhost` und Nhost-Env) starten.
- Nutzer sich in Nhost anmelden (gleiche E-Mail wie in Supabase).
- Projekte und Welten sollten in der App sichtbar sein, da sie nun aus Nhost/Hasura geladen werden.

Falls etwas fehlt: Logs des Migrationsskripts prüfen (welche Tabellen/Zeilen eingefügt wurden, ob User-Mapping für alle vorkommenden Supabase-User-IDs definiert ist).
