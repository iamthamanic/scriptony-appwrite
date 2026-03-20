# Exakt: Was du tun musst (damit etwas „läuft“)

Kontext: **[SOURCE_OF_TRUTH.md](SOURCE_OF_TRUTH.md)**  
Dieses Dokument ist die **Schritt-für-Schritt-Anleitung**. Es gibt **zwei** sinnvolle Ziele:

| Ziel | Was „läuft“ |
|------|----------------|
| **A – Local-Dev-Stack** | Postgres + Hasura + Lucia-Auth in Docker (Ports 5432 / 8080 / 3001) |
| **B – Scriptony-Webapp** | Frontend + **Nhost** (Auth, GraphQL, Storage, Functions) — Cloud oder Self-Hosted |

Die Web-App **funktioniert nicht** nur mit Ziel A; sie braucht **Nhost** (Ziel B).

---

## Ziel A — Docker-Stack auf dem Server (z. B. `srv1097719`)

**Einmalig / nach jedem `git pull`:**

```bash
cd ~/scriptony-prod
git pull origin main
docker compose --profile local-dev down
docker compose --profile local-dev up -d --build
sleep 25
docker compose --profile local-dev ps
curl -sS -o /dev/null -w "Hasura HTTP %{http_code}\n" http://127.0.0.1:8080/healthz
curl -sS http://127.0.0.1:3001/health
```

**Erwartung:** Alle drei Container `healthy` oder `Up`; Hasura **HTTP 200**; Auth JSON `{"status":"ok",...}`.

**Optional (im Repo auf dem Rechner):**

```bash
npm run docker:local-dev:verify
```

(ruft `scripts/verify-local-dev-stack.sh` auf — nur sinnvoll, wenn Docker lokal gleich wie auf dem Server läuft.)

**Wichtig:** Ohne `--profile local-dev` startet **nichts**.

---

## Ziel A — Über GitHub Actions (automatisch)

1. In GitHub: **Settings → Secrets and variables → Actions** — diese Secrets setzen:  
   `SSH_PRIVATE_KEY`, `SSH_HOST`, `SSH_USER`, `DATABASE_URL`, `JWT_SECRET`, `MINIO_SECRET_KEY`, `DOMAIN`
2. Auf dem Server: **SSH-Deploy-Key** für `git@github.com:iamthamanic/Scriptonyapp.git`, damit `git pull` klappt.
3. **Push auf `main`** → Workflow **scriptony CI/CD** → nach grünem **ci**-Job läuft **deploy-prod** → führt auf dem Server `docker compose --profile local-dev up -d --build` aus.

---

## Ziel B — Scriptony-Webapp (das, was Nutzer im Browser sehen)

### Variante B1 — Schnellstart: Nhost **Cloud**

1. Projekt in [Nhost](https://nhost.io) anlegen / bestehendes nutzen.
2. **`nhost/`** + **Functions** deployen: lokal `nhost login`, dann z. B. `npm run deploy:nhost` (Branch beachten).
3. **Nhost Dashboard → Authentication → URLs:** Redirect/Site-URL = deine Frontend-URL (lokal z. B. `http://localhost:5173`).
4. **Frontend `.env.local`:**  
   `npm run env:local -- DEINE_SUBDOMAIN eu-central-1`  
   oder Werte aus `.env.example` manuell setzen.
5. **Lokal:** `npm install` → `npm run dev` → Browser öffnen.  
6. **Production-Frontend:** `npm run build`, Ordner **`build/`** auf nginx/Caddy/Vercel ausliefern; in der Build-Umgebung alle **`VITE_*`** für **Production** setzen (siehe `.env.example`).

### Variante B2 — Nhost **Self-Hosted** (Hasura bei dir)

1. Offizielle Anleitung: [Nhost Self-Hosting](https://docs.nhost.io/platform/self-hosting/overview) auf deinem VPS (oder eigenem Host) umsetzen.
2. DNS/TLS für Auth-, GraphQL-, Storage-, Functions-URLs.
3. **`VITE_NHOST_*`** (oder Subdomain+Region) im **Frontend-Build** auf **deine** Hostnames setzen — siehe [SELF_HOSTING.md](SELF_HOSTING.md).
4. **Docker Local-Dev-Stack** (`--profile local-dev`) auf dem **gleichen** Server nur nutzen, wenn du ihn wirklich brauchst; für die echte App ist **ein** Nhost-Stack maßgeblich.

---

## Kurz-Entscheidung

- Nur **API/DB/Hasura zum Testen** → **Ziel A** reicht.  
- **Scriptony wie im Repo gedacht** → **Ziel B** (Nhost Cloud oder Self-Hosted) **plus** gebautes Frontend.

---

*Siehe auch: [SOURCE_OF_TRUTH.md](SOURCE_OF_TRUTH.md), [DEPLOYMENT.md](DEPLOYMENT.md)*
