# DevOps-Empfehlung (Scriptony + Appwrite)

Orientierung für **kleine Teams / Solo**: wenig bewegliche Teile, klar getrennte Verantwortlichkeiten, später erweiterbar.

---

## 1. Zielbild: drei Schichten

| Schicht | Was | Typische Ausführung |
|---------|-----|---------------------|
| **Frontend** | Statische Dateien aus `npm run build` | CI baut, **rsync oder Upload** auf VPS/nginx **oder** Vercel/Netlify |
| **Appwrite** | Auth, DB, Storage, Konsole | **Ein** Docker-Stack pro Umgebung (z. B. `infra/appwrite` auf VPS) |
| **Scriptony Functions** | HTTP-API der App | Appwrite Functions **oder** eigener Node-Host hinter Reverse-Proxy |

**Optimal (KISS):** Alles auf **einem VPS** ist okay, solange du **Subdomains** und getrennte **Umgebungen** (test/prod) führst — nicht alles unter einer IP ohne Namen.

---

## 2. Umgebungen (minimum sinnvoll)

| Umgebung | Branch | Zweck |
|----------|--------|--------|
| **Development** | lokal | `localhost` + optional Docker-Appwrite lokal |
| **Staging** | `develop` | Gleiche Architektur wie Prod, andere URLs/Secrets, zum Testen vor Release |
| **Production** | `main` | Nur getestete Releases |

**DevOps-Standard:** Staging soll **so ähnlich wie Prod** sein wie möglich (gleicher Compose-Pfad, gleicher Deploy-Ablauf), nur andere Domains und Keys.

---

## 3. Domains und TLS (empfohlen)

Klare Subdomains, ein **Reverse-Proxy** (Caddy oder nginx) mit **Let’s Encrypt**:

| Subdomain | Dienst |
|-----------|--------|
| `app.deine-domain.tld` | Vite-`build/` (statisch) |
| `appwrite.deine-domain.tld` **oder** Pfad unter einer Domain | Appwrite (Traefik im Compose mappt oft 80/443; auf dem Host nur Proxy davor) |
| Optional `api.deine-domain.tld` | Einstieg zu Scriptony-Functions, falls nicht unter Appwrite-URL |

**Warum:** Zertifikate, CORS und Appwrite **erlaubte URLs** bleiben nachvollziehbar; du mischst nicht Nhost-Altlast und Appwrite auf demselben Hostnamen.

---

## 4. CI/CD: was wo bauen?

**Empfohlen:**

- **Frontend im CI bauen** (wie bei optional `DEPLOY_STATIC_FRONTEND`): reproduzierbar, gleiche Node/Bun-Version, keine Build-Tools auf dem VPS nötig.
- **Artefakt ausliefern:** `rsync` auf den Webroot **oder** S3/Objektspeicher + CDN — je nach Größe und Traffic.
- **Appwrite auf dem VPS:** nur `docker compose … up -d` nach `git pull` (wie im aktuellen Workflow), **kein** Appwrite-Image im eigenen Dockerfile pflegen.

**Weniger optimal:** Nur auf dem Server `npm run build` — geht, aber schwerer reproduzierbar und braucht mehr RAM/CPU auf dem VPS.

---

## 5. Secrets und Konfiguration (GitHub)

**Best Practice:** [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment) **`production`** und **`staging`** mit **jeweils eigenen Secrets** (`VITE_*`, SSH falls unterschiedlich, später ggf. getrennte Deploy-Keys).

Aktuell nutzt der Workflow **Repository-Secrets** für alle — das reicht zum Start. Bevor du echten Traffic hast: auf **Environment-Secrets** umstellen, damit Test-URLs nie aus Versehen Prod-Daten ansprechen.

**Auf dem VPS niemals ins Git:** `infra/appwrite/.env` nur auf dem Server (Backup separat, verschlüsselt).

---

## 6. Scriptony Functions

**Optimal:** Ein klarer **Deploy-Schritt** pro Release:

- Entweder **Appwrite Console / CLI** für Functions mit denselben `APPWRITE_*` wie die Instanz  
- Oder **ein** Skript/Job, das alle `functions/scriptony-*` ausrollt

Der vorhandene GitHub-Workflow **deployt die Functions nicht** — das ist bewusst, weil das vom Appwrite-Setup abhängt. Langfristig lohnt ein **zweiter Workflow** „deploy-functions“ oder ein Makefile-Ziel, das du nach Appwrite-Updates fährst.

---

## 7. Backup und Wiederanlauf

| Was | Empfehlung |
|-----|------------|
| **Appwrite** | Regelmäßiger **MariaDB-Dump** + Backup der Appwrite-**Volumes** (Uploads, Config), getestete Restore-Übung |
| **Frontend** | Git + CI-Artefakt reicht (kein DB-Backup nötig) |
| **Secrets** | Passwort-Manager / verschlüsselter Vault, nicht nur auf dem VPS |

---

## 8. Nhost → Appwrite auf dem VPS

1. **Parallelbetrieb kurz** nur mit **anderen Ports/Hostnames**, nicht zwei Systeme auf `app.` gleichzeitig.  
2. **Cutover:** DNS auf Appwrite + neues Frontend zeigen, **alten** Compose `down`, Volumes erst löschen, wenn Restore geklärt ist.  
3. **Monitoring** nach Cutover: Appwrite `/v1/health`, eine Login- und eine Function-Anfrage.

---

## 9. Kurzfassung „optimal für dich“

1. **Zwei VPS-Pfade** wie im Workflow: `/root/scriptony-prod` (main) und `/root/scriptony-test` (develop) — oder ein VPS nur mit Prod und Staging lokal per Docker; für echtes Staging brauchst du oft **zwei** Appwrite-Instanzen oder strikt getrennte Projekte.  
2. **Subdomains + TLS** mit einem Reverse-Proxy vor Appwrite und statischem Site-Root.  
3. **Frontend in CI bauen**, mit **`DEPLOY_STATIC_FRONTEND`** und getrennten **`SCRIPTONY_WEB_ROOT_*`** wenn du nginx auf dem VPS nutzt.  
4. **Später:** GitHub Environments, eigener Functions-Deploy-Job, Backups automatisieren.

---

## Verknüpfung mit diesem Repo

- Deploy-Details: [GITHUB_ACTIONS_DEPLOY.md](GITHUB_ACTIONS_DEPLOY.md)  
- Checkliste Server: [SERVER_ROLLOUT.md](SERVER_ROLLOUT.md)  
- Architektur: [ENTWICKLER_HANDBUCH.md](ENTWICKLER_HANDBUCH.md)
