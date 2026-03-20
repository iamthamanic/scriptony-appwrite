# Scriptony: Alles in Docker (inkl. Nhost)

## Was du meinst mit „alles soll in Docker laufen“

**Ja — das geht.** Das komplette Scriptony-Backend (Postgres, **Hasura**, **Auth**, **Storage**, **Functions-Runtime**) ist bei **Nhost Self-Hosted** als **Docker-Stack** (bzw. Kubernetes, je nach Anleitung) vorgesehen.

**Wichtig:** Das ist **nicht** die kleine Datei `docker-compose.yml` im **Wurzelverzeichnis** dieses Repos. Diese Datei startet absichtlich nur einen **optionalen Local-Dev-Stack** (`--profile local-dev`: Postgres + einzelner Hasura + Lucia) und **ersetzt Nhost nicht**.

Der **volle** Nhost-Stack kommt aus dem **offiziellen Nhost Self-Hosting** — eigenes Compose/Helm, eigene Services, eigene Netzwerke.

---

## Ziel-Architektur „alles in Docker“

| Teil | Wo es läuft |
|------|-------------|
| **Nhost (Auth, Hasura, Storage, Functions-Runtime)** | Offizielles **Nhost Self-Hosting** → Container auf deinem Server |
| **Deine Business-Functions** (`functions/*`) | Deploy mit **Nhost CLI** gegen diese Instanz (`npm run deploy:nhost` o. ä.) |
| **Konfiguration** | `nhost/nhost.toml` + Secrets (Dashboard/Env des Nhost-Stacks) |
| **Frontend** | Weiterhin **Vite-Build** (`build/`). Du **kannst** den statischen Inhalt auch in Docker ausliefern (nginx/Caddy-Container) — das ist aber **optional**; technisch ist es nur statische Dateien. |

---

## Konkrete Schritte (hohe Ebene)

1. **Nhost Self-Hosting** nach offizieller Doku aufsetzen:  
   [Nhost — Self-hosting overview](https://docs.nhost.io/platform/self-hosting/overview)  
   (dort: Getting Started, Docker/Kubernetes, Domains, TLS.)

2. **DNS** für die von Nhost erwarteten Hosts (Auth, GraphQL, Storage, Functions) auf deinen Server zeigen.

3. **Dieses Repo** mit **Nhost CLI** verbinden (`nhost link` / Projekt-ID), dann:
   - `npm run deploy:nhost:config` (Config anwenden),  
   - `npm run deploy:nhost` (Functions deployen),  
   je nachdem, wie dein Self-Hosted-Workflow dokumentiert ist.

4. **Frontend** bauen mit **`VITE_*`** auf **deine** Self-Hosted-URLs (siehe `.env.example`, [SELF_HOSTING.md](SELF_HOSTING.md)).

5. **Optional:** Den **Local-Dev-Compose** dieses Repos (`docker compose --profile local-dev`) **auf dem Produktions-Server stoppen**, sobald Nhost Self-Hosted live ist — sonst hast du **zwei** Postgres/Hasura-Kandidaten und verwirrende Ports.  
   ```bash
   cd ~/scriptony-prod && docker compose --profile local-dev down
   ```

---

## Warum wir Nhost nicht „einfach in dieselbe docker-compose.yml packen“

Der Nhost-Stack ist **viele** Services, **Versionspinning**, **Secrets** und **Upgrades** — das pflegt das Nhost-Team im **offiziellen** Repo/Chart. Das hier zu duplizieren würde **schnell veralten** und Deploys riskanter machen.  
Stattdessen: **offiziellen Stack deployen** + **dieses Repo** nur für App-Code, `nhost.toml` und `functions/`.

---

## Verwandte Docs

- [SOURCE_OF_TRUTH.md](SOURCE_OF_TRUTH.md) — Rollen von Repo-Compose vs. Nhost  
- [EXACT_STEPS.md](EXACT_STEPS.md) — Befehle Server / CI / Webapp  
- [DOCKER_SETUP.md](../DOCKER_SETUP.md) — nur Local-Dev-Compose im Repo
