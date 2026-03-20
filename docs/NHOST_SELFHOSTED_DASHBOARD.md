# Nhost Docker Self-Hosted: Wo sind die „Auth URLs“?

Beim **offiziellen Beispiel** unter `examples/docker-compose` ist das Dashboard **kein** vollwertiges Nhost-Cloud-Dashboard (`NEXT_PUBLIC_NHOST_PLATFORM: "false"`). Deshalb gibt es oft **keinen** Menüpunkt wie **Authentication → URL Configuration** wie in der Cloud.

## Wo die Werte wirklich stehen

Im **`docker-compose.yaml`** des Beispiels ist der **Auth**-Service so vorkonfiguriert:

| Variable | Standard im Beispiel | Bedeutung |
|----------|----------------------|-----------|
| **`AUTH_CLIENT_URL`** | `http://localhost:3000` | Basis-URL der App (Redirects) |
| **`AUTH_ACCESS_CONTROL_ALLOWED_REDIRECT_URLS`** | `""` (leer) | Erlaubte Redirect-URLs (oft nötig, wenn Login meckert) |

Anpassen geht per **`docker-compose.override.yml`** (wird automatisch mitgeladen) oder durch Editieren der Compose-Datei — **nicht** über ein fehlendes Dashboard-Feld.

## Fertige Datei in diesem Repo

**[`infra/nhost-official-docker-compose/docker-compose.override.yml`](../infra/nhost-official-docker-compose/docker-compose.override.yml)** — ins Verzeichnis mit der offiziellen `docker-compose.yaml` kopieren (z. B.  
`/root/nhost-upstream/examples/docker-compose/`), siehe **[`infra/nhost-official-docker-compose/README.md`](../infra/nhost-official-docker-compose/README.md)**.

```bash
cd /root/nhost-upstream/examples/docker-compose
# von deinem Scriptony-Clone aus:
# cp /pfad/zu/Scriptonyapp/infra/nhost-official-docker-compose/docker-compose.override.yml .
docker compose up -d
```

(Format der erlaubten URLs: siehe [Nhost Auth env](https://docs.nhost.io/reference/auth/environment-variables) — bei Bedarf Wildcards/Pfade ergänzen.)

## Scriptony + Vite

Unser Vite-Dev-Server nutzt **Port 3000** (`vite.config.ts`). **`AUTH_CLIENT_URL`** und **`VITE_*`-Redirects** sollten beide **`http://localhost:3000`** (bzw. `127.0.0.1` zusätzlich) verwenden.

## Nutzer anlegen (ohne Dashboard-Cloud-UI)

Siehe **[NHOST_SELFHOSTED_USERS.md](NHOST_SELFHOSTED_USERS.md)** und **`scripts/nhost-signup-email-password.sh`**.
