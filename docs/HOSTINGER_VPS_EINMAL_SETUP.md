# Hostinger VPS — alle Befehle (Nhost → Appwrite, Ubuntu + Docker)

Einmaliger Ablauf per SSH (als **root** oder mit `sudo` wo nötig). Repo: **[iamthamanic/scriptony-appwrite](https://github.com/iamthamanic/scriptony-appwrite)**.

**Voraussetzungen:** Auf dem Server ist **Docker** + **Docker Compose v2** installiert; für `git clone` per SSH ist ein **[Deploy-Key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)** mit Lesezugriff auf das Repo bei GitHub hinterlegt.

---

## 0) Optional: System aktualisieren & neustarten (eigenes Fenster)

```bash
apt update && apt upgrade -y
# reboot   # wenn Meldung "System restart required"
```

---

## 1) Backup Nhost-Postgres (empfohlen)

```bash
mkdir -p /root/backups/nhost-pre-appwrite
docker exec docker-compose-postgres-1 pg_dumpall -U postgres > /root/backups/nhost-pre-appwrite/pg_dumpall-$(date +%Y%m%d-%H%M).sql
ls -la /root/backups/nhost-pre-appwrite/
```

Falls der Container anders heißt:

```bash
docker ps --format '{{.Names}}' | grep -i postgres
```

---

## 2) Nhost-Stack stoppen

```bash
cd /root/nhost-upstream/examples/docker-compose
docker compose down
docker ps -a
```

---

## 3) Alten App-Ordner umbenennen (falls vorhanden)

```bash
test -d /root/Scriptonyapp && mv /root/Scriptonyapp "/root/Scriptonyapp.bak.$(date +%Y%m%d)" && echo "OK: umbenannt" || echo "Kein /root/Scriptonyapp — überspringen"
```

---

## 4) Produktions-Repo klonen oder aktualisieren

```bash
cd /root
test -d scriptony-prod/.git || git clone -b main "git@github.com:iamthamanic/scriptony-appwrite.git" scriptony-prod
cd /root/scriptony-prod
git fetch origin
git checkout main
git pull origin main
ls -la infra/appwrite/docker-compose.yml
```

---

## 5) Appwrite `.env` anlegen und bearbeiten

```bash
cd /root/scriptony-prod
cp infra/appwrite/.env.example infra/appwrite/.env
chmod 600 infra/appwrite/.env
nano infra/appwrite/.env
```

In `nano` mindestens **Produktionswerte** setzen: `_APP_DOMAIN`, `_APP_OPENSSL_KEY_V1`, DB-/Redis-Passwörter, E-Mail-Domain — **nicht** die Beispielwerte aus der Vorlage nutzen.

Speichern: `Ctrl+O`, Enter, `Ctrl+X`.

---

## 6) Swap (bei ~4 GiB RAM empfohlen)

```bash
test -f /swapfile || (fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile)
grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h
```

---

## 7) Appwrite starten

```bash
cd /root/scriptony-prod
docker compose --env-file infra/appwrite/.env pull || true
docker compose --env-file infra/appwrite/.env up -d
docker compose --env-file infra/appwrite/.env ps
curl -sS -o /dev/null -w "Appwrite health HTTP %{http_code}\n" "http://127.0.0.1:8080/v1/health" || true
```

Intern ist Appwrite über **Port 8080** erreichbar (Traefik). Öffentlich: Reverse-Proxy (Panel oder nginx) auf diese Adresse legen.

---

## 8) Firewall (SSH + Web, Postgres zu)

```bash
command -v ufw >/dev/null && ufw allow OpenSSH
command -v ufw >/dev/null && ufw allow 80/tcp
command -v ufw >/dev/null && ufw allow 443/tcp
command -v ufw >/dev/null && ufw deny 5432/tcp
command -v ufw >/dev/null && ufw --force enable
command -v ufw >/dev/null && ufw status verbose
```

---

## Danach (nicht nur Shell)

1. **Appwrite Console** öffnen (über deine Domain/Proxy), Projekt anlegen, **Authentication URLs** = Frontend-URL.
2. **Functions** deployen mit `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`.
3. **Frontend** bauen (`VITE_*`) und statisch ausliefern — siehe [GITHUB_ACTIONS_DEPLOY.md](GITHUB_ACTIONS_DEPLOY.md).

Ausführlichere Einordnung: [SERVER_MIGRATION_RUNBOOK.md](SERVER_MIGRATION_RUNBOOK.md).
