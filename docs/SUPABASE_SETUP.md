# Supabase-Projekt: Setup & Wiederherstellung

Dieses Dokument beschreibt, wie das Supabase-Projekt ins Repo gesichert ist und wie man es wieder aufsetzt oder sichert.

## PROJECT_REF

- **PROJECT_REF:** `ctkouztastyirjywiduc`
- Dashboard: https://supabase.com/dashboard/project/ctkouztastyirjywiduc
- Im Code: `src/utils/supabase/info.tsx` (`projectId`)

## Voraussetzungen

- **Supabase CLI:** `brew install supabase/tap/supabase` (macOS)
- **Docker:** muss laufen (`docker info`)
- **Optional:** `jq` für JSON (sonst z.B. Python)

## Login & Link

```bash
# Einmalig einloggen (Browser-Token)
supabase login

# Im Repo-Root: Projekt linken
export PROJECT_REF=ctkouztastyirjywiduc
supabase link --project-ref "$PROJECT_REF"
# Bei Abfrage: DB-Passwort aus Supabase Dashboard (Settings → Database) oder Umgebungsvariable SUPABASE_DB_PASSWORD
```

## Backup-Befehle

- **Schema + Data (für Repo-Sicherung, inkl. echte Daten):**
  ```bash
  supabase db dump -f supabase/backups/schema_and_data_$(date +%Y%m%d_%H%M%S).sql
  supabase db dump --data-only -f supabase/backups/data_only_temp.sql
  cd supabase/backups && cat schema_and_data_*.sql data_only_temp.sql > schema_and_data_$(date +%Y%m%d_%H%M%S)_full.sql
  cp schema_and_data_*_full.sql schema_and_data_LATEST.sql
  rm data_only_temp.sql
  ```
- **Nur Schema:** `supabase db dump -f supabase/backups/schema_$(date +%Y%m%d_%H%M%S).sql`
- **Nur Data:** `supabase db dump --data-only -f supabase/backups/data_$(date +%Y%m%d_%H%M%S).sql`

Die Datei `supabase/backups/schema_and_data_LATEST.sql` wird versioniert (Ausnahme in `.gitignore`), damit ein Restore-Snapshot immer im Repo liegt.

## Restore (neues Projekt / nach Löschen)

1. Neues Supabase-Projekt anlegen oder bestehendes leeren.
2. `supabase link --project-ref "<NEUER_REF>"`
3. Restore:
   ```bash
   psql "<DATABASE_URL>" -f supabase/backups/schema_and_data_LATEST.sql
   ```
   Oder über Dashboard: SQL Editor → Inhalt von `schema_and_data_LATEST.sql` ausführen (bei sehr großen Dateien in Chunks oder per `psql`).
4. Edge Functions deployen: `supabase functions deploy` (aus Repo-Root).

## Im Repo vs. separat sichern

| Im Repo | Separat sichern |
|--------|------------------|
| `supabase/config.toml` | DB-Passwort (Dashboard / env) |
| `supabase/migrations/*.sql` | Service Role Key (Dashboard) |
| `supabase/functions/*` (Edge Functions Source) | Anon Key (optional, auch in `src/utils/supabase/info.tsx`) |
| `supabase/backups/schema_and_data_LATEST.sql` (Schema + Data) | Weitere Backup-Dateien (timestamped) nur lokal/Backup-Storage |
| `docs/SUPABASE_SETUP.md` | |
| PROJECT_REF in `src/utils/supabase/info.tsx` | |

## Edge Functions (Namen)

- `make-server-3b52693b` – Haupt-Server (Projects, Worlds, Health)
- `scriptony-auth`, `scriptony-timeline-v2`, `scriptony-audio`, `scriptony-projects`, `scriptony-worldbuilding`, `scriptony-stats`, `scriptony-logs`, `scriptony-characters`, `scriptony-beats`, `scriptony-inspiration`, `scriptony-assistant`, `scriptony-shots`, `scriptony-project-nodes`, `scriptony-gym`, `scriptony-superadmin`

Deploy: `supabase functions deploy` (alle) oder `supabase functions deploy <name>`.
