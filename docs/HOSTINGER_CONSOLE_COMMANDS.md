# Hostinger (VPS): Befehle zum Abhaken

**Hinweis:** Skripte wie `scripts/hostinger-apply-schema.sh` liegen im GitHub-Repo auf **`main`**. Nach einem frühen Clone unbedingt **`git pull`** im Projektordner ausführen.

Alles hier läuft in der **SSH-Konsole auf dem Server** (root), **wenn** der Nhost-Stack aus `~/nhost-upstream/examples/docker-compose` bereits mit `docker compose up -d` läuft.

**Wichtig:** Danach **einmal** im **Browser auf deinem Mac** Hasura öffnen und Tabellen tracken (Schritt 4) — das geht nicht sinnvoll rein über die Server-Konsole.

---

## 0. Admin-Secret merken (für Schritt 4)

```bash
grep '^GRAPHQL_ADMIN_SECRET=' ~/nhost-upstream/examples/docker-compose/.env
```

Wert notieren (Login Hasura Console).

---

## 1. Repo holen

**GitHub:** Normales Passwort funktioniert bei HTTPS **nicht**. Eine von drei Varianten:

### A) SSH (wenn auf dem Server `ssh -T git@github.com` klappt)

```bash
cd /root
git clone git@github.com:iamthamanic/Scriptonyapp.git Scriptonyapp
cd /root/Scriptonyapp
```

### B) HTTPS + Personal Access Token (empfohlen ohne SSH)

Auf GitHub: **Settings → Developer settings → Personal access tokens** → Token mit Scope **`repo`** erzeugen.  
Beim Clone ist **Passwort = das Token** (nicht dein Login-Passwort).

```bash
cd /root
git clone https://github.com/iamthamanic/Scriptonyapp.git Scriptonyapp
# Username: iamthamanic  |  Password: ghp_xxxx (Token)
cd /root/Scriptonyapp
git pull
```

### C) Repo öffentlich machen

Dann reicht `git clone https://github.com/iamthamanic/Scriptonyapp.git` ohne Token.

**Nicht** `2>/dev/null` um `git clone` legen — sonst siehst du Fehler nicht.

*(Remote-URL anpassen, falls dein Fork/Org anders heißt.)*

---

## 2. Skript ausführbar machen und Schema einspielen

```bash
chmod +x /root/Scriptonyapp/scripts/hostinger-apply-schema.sh
bash /root/Scriptonyapp/scripts/hostinger-apply-schema.sh
```

Das spielt alle Dateien unter **`supabase/migrations/`** in die **Nhost-Postgres**-DB ein und setzt vorher eine Stub-Funktion **`auth.uid()`**, damit alte Supabase-RLS-SQL durchläuft (Hasura-Rechte kommen ohnehin aus JWT/Metadata, nicht aus dieser Stub-Funktion).

---

## 3. Kurz prüfen (optional)

```bash
docker exec -i "$(docker ps --format '{{.Names}}' | grep -E 'postgres' | grep -v migrate | head -n1)" \
  psql -U postgres -d postgres -c "\dt public.*" | head -40
```

---

## 4. Hasura: Tabellen tracken (auf dem Mac, Browser)

1. Öffnen: **`http://local.graphql.local.nhost.run/console`**  
   (Hosts-Datei auf dem Mac muss wie bisher zur VPS-IP zeigen.)
2. Mit **Admin Secret** einloggen (aus Schritt 0).
3. **Data** → Default-Datenbank → Schema **`public`** → **Track all** (oder einzeln tracken).

Ohne diesen Schritt liefert GraphQL für Scriptony noch keine Tabellen.

**Rechte (Permissions):** Standard-Hasura ist restriktiv. Für echte Nutzerrechte brauchst du später Nhost/Hasura-Permissions mit JWT (`x-hasura-user-id` etc.) — das ist mehr als „ein Klick“; für einen ersten Smoke-Test reicht oft Rolle **admin** in der Console.

---

## 5. Auth-User (auf dem Mac, Terminal)

Wenn öffentliches Signup aus ist, User per API anlegen (siehe `docs/NHOST_SELFHOSTED_USERS.md`), z. B.:

```bash
cd /pfad/zu/Scriptonyapp   # dein Mac-Clone
./scripts/nhost-signup-email-password.sh 'du@deinedomain.de' 'Mind.9Zeichen!'
```

---

## Wenn Schritt 2 mit Fehler abbricht

- Nicht erneut blind ausführen — DB kann halb migriert sein.
- Backup vorher (optional):

```bash
docker exec "$(docker ps --format '{{.Names}}' | grep -E 'postgres' | grep -v migrate | head -n1)" \
  pg_dump -U postgres postgres > /root/scriptony-pg-backup-$(date +%F).sql
```

---

## Referenz

- Nhost-Compose & Redirects: `infra/nhost-official-docker-compose/`, `docs/NHOST_SELFHOSTED_DASHBOARD.md`
- Test vom Mac: `npm run verify:test-env` — `docs/TEST_ENV_REMOTE_NHOST.md`
