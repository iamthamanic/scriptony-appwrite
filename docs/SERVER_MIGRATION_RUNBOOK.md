# Server: Nhost → Appwrite (Copy-Paste für das Terminal)

**Entscheidung im Repo:** Kanonisches Produktionsverzeichnis ist **`/root/scriptony-prod`** (Branch `main`). Test: **`/root/scriptony-test`** (Branch `develop`). Das entspricht [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

**GitHub-Repo in den `git clone`-Zeilen:** Standard ist `iamthamanic/Scriptonyapp`. Bei einem **Fork** überall durch `DEIN_USER/Scriptonyapp` ersetzen.

Der Ordner **`/root/Scriptonyapp`** ist **kein** Deploy-Ziel — nach der Migration nur noch Archiv löschen oder umbenennen, damit es keine Verwechslung gibt.

---

## Vor dem ersten Cutover (Pflicht: lesen)

1. **Backup**, wenn du Nhost-Daten brauchst: Postgres-Dump, MinIO-Daten, Notizen zu `.env`.
2. **Cutover = Ausfall** der alten API für die Dauer des Wechsels (Minuten bis länger).
3. Auf dem Server muss **`infra/appwrite/.env`** existieren (wird **nicht** aus Git deployt). Ohne diese Datei startet der Appwrite-Compose nicht sinnvoll.
4. Nach `git pull` muss der Ordner **`infra/appwrite/`** im Repo vorhanden sein (kommt mit dem Appwrite-Migrations-Stand von `main`).

---

## Phase A — Backup Nhost-Postgres (optional, empfohlen)

```bash
mkdir -p /root/backups/nhost-pre-appwrite
docker exec docker-compose-postgres-1 pg_dumpall -U postgres > /root/backups/nhost-pre-appwrite/pg_dumpall-$(date +%Y%m%d-%H%M).sql
ls -la /root/backups/nhost-pre-appwrite/
```

(Wenn der Container-Name bei dir anders ist: `docker ps --format '{{.Names}}' | grep -i postgres`)

---

## Phase B — Nhost-Stack stoppen (freigibt Port 80 / 5432 vom Nhost-Setup)

```bash
cd /root/nhost-upstream/examples/docker-compose
docker compose down
docker ps -a
```

**Hinweis:** `docker compose down -v` würde **Volumes löschen** — nur verwenden, wenn du die Daten wirklich nicht mehr brauchst.

---

## Phase C — Repo auf dem Server aktualisieren (Produktion)

```bash
cd /root
test -d scriptony-prod/.git || git clone -b main "git@github.com:iamthamanic/Scriptonyapp.git" scriptony-prod
cd /root/scriptony-prod
git fetch origin
git checkout main
git pull origin main
ls -la infra/appwrite/docker-compose.yml
```

Fehlt `infra/appwrite/docker-compose.yml`, ist der Remote-Stand noch alt — dann zuerst lokal pushen und erneut `git pull`.

---

## Phase D — Appwrite-Umgebungsdatei (einmalig, Secrets von Hand)

```bash
cd /root/scriptony-prod
cp infra/appwrite/.env.example infra/appwrite/.env
chmod 600 infra/appwrite/.env
nano infra/appwrite/.env
```

**Mindestens prüfen/setzen** (Namen können in der Example-Datei leicht abweichen — an die `_APP_*` in der Datei halten):

- `_APP_DOMAIN` — öffentliche Domain der Appwrite-Instanz (ohne `https://`)
- `_APP_OPENSSL_KEY_V1` — **nicht** `learning-key` in Produktion; starken Wert setzen (Appwrite-Doku)
- `_APP_DB_PASS`, `_APP_DB_ROOT_PASS`, `_APP_REDIS_PASS` — starke Passwörter
- Alle weiteren `_APP_*`, die deine Domain/E-Mail betreffen

Speichern und Editor beenden (nano: `Ctrl+O`, Enter, `Ctrl+X`).

---

## Phase E — Swap (empfohlen bei ~4 GiB RAM, einmalig)

```bash
test -f /swapfile || (fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile)
grep -q swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h
```

---

## Phase F — Appwrite starten

```bash
cd /root/scriptony-prod
docker compose --env-file infra/appwrite/.env pull || true
docker compose --env-file infra/appwrite/.env up -d
docker compose --env-file infra/appwrite/.env ps
curl -sS -o /dev/null -w "Appwrite health HTTP %{http_code}\n" "http://127.0.0.1:8080/v1/health" || true
```

Standard aus dem Compose: **HTTP intern auf Host-Port 8080** (Traefik → Appwrite). Öffentlich erreichbar machst du das per **Reverse-Proxy** (nginx/Caddy) auf 443 — oder du passt Ports in einer **override**-Datei an (fortgeschritten).

---

## Phase G — Firewall (5432 nicht öffentlich)

```bash
command -v ufw >/dev/null && ufw status verbose || true
command -v ufw >/dev/null && ufw allow OpenSSH
command -v ufw >/dev/null && ufw allow 80/tcp
command -v ufw >/dev/null && ufw allow 443/tcp
command -v ufw >/dev/null && ufw deny 5432/tcp
command -v ufw >/dev/null && ufw --force enable || true
```

(Wenn du Postgres absichtlich nur für dich von außen brauchst, Regel anpassen — Standard ist: **nicht** öffentlich.)

---

## Phase H — System-Updates & Reboot (eigenes Wartungsfenster)

```bash
apt update
apt list --upgradable | head -30
# Wenn du upgraden willst:
# apt upgrade -y
# reboot
```

---

## Phase I — Doppeltes Repo aufräumen

Wenn alles unter `/root/scriptony-prod` läuft:

```bash
test -d /root/Scriptonyapp && mv /root/Scriptonyapp "/root/Scriptonyapp.bak.$(date +%Y%m%d)" && echo "Backup-Verzeichnis angelegt."
```

---

## Test-Umgebung (`develop`) — Kurzfassung

```bash
cd /root
test -d scriptony-test/.git || git clone -b develop "git@github.com:iamthamanic/Scriptonyapp.git" scriptony-test
cd /root/scriptony-test
git pull origin develop
cp infra/appwrite/.env.example infra/appwrite/.env
chmod 600 infra/appwrite/.env
nano infra/appwrite/.env
docker compose --env-file infra/appwrite/.env up -d
```

**Achtung:** Zwei Appwrite-Stacks auf **einem** kleinen VPS brauchen **andere Ports** für den zweiten Traefik — sonst Konflikt. Für den Start reicht oft **nur Produktion**; Test später oder auf zweitem Host.

---

## Danach (nicht nur Terminal)

1. **Appwrite Console:** Projekt anlegen, **Authentication URLs** = deine Frontend-URL.
2. **Functions** deployen (`APPWRITE_*` auf dem Functions-Host).
3. **Frontend** bauen mit passenden `VITE_*` und ausliefern (siehe [GITHUB_ACTIONS_DEPLOY.md](GITHUB_ACTIONS_DEPLOY.md)).
4. GitHub **Secrets** für SSH + optional statisches Deploy setzen.

Weitere Einordnung: [SERVER_ROLLOUT.md](SERVER_ROLLOUT.md), [DEVOPS_EMPFEHLUNG.md](DEVOPS_EMPFEHLUNG.md).
