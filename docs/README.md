# Scriptony documentation

- **[SOURCE_OF_TRUTH.md](SOURCE_OF_TRUTH.md)** — architecture: Appwrite + Scriptony HTTP functions + Vite frontend
- **[ENTWICKLER_HANDBUCH.md](ENTWICKLER_HANDBUCH.md)** — Onboarding, Self-Host-Überblick, KISS/DRY/SOLID, Verzeichnis-Landkarte
- **[DEPLOYMENT.md](DEPLOYMENT.md)** — env vars, Vercel, security notes
- **[SELF_HOSTING.md](SELF_HOSTING.md)** — eigenes Frontend + Appwrite + Functions (inkl. Docker-Appwrite im Repo)
- **[SERVER_ROLLOUT.md](SERVER_ROLLOUT.md)** — Checkliste VPS; Abgleich mit GitHub Actions Deploy
- **[SERVER_MIGRATION_RUNBOOK.md](SERVER_MIGRATION_RUNBOOK.md)** — Terminal-Befehle: Nhost runter, Appwrite hoch (`/root/scriptony-prod`)
- **[GITHUB_ACTIONS_DEPLOY.md](GITHUB_ACTIONS_DEPLOY.md)** — Secrets, Variablen, optional statisches Frontend per rsync
- **[DEVOPS_EMPFEHLUNG.md](DEVOPS_EMPFEHLUNG.md)** — empfohlene Architektur (Umgebungen, Domains, CI vs. VPS)
- **[EXACT_STEPS.md](EXACT_STEPS.md)** — minimal runbook for local dev

**`docker-compose.yml`** includes local **Appwrite** (`infra/appwrite/`). **`docker-compose.legacy.yml`** + `profile: local-dev` is optional Postgres/Lucia only.
