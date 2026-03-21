# Scriptony

**Professional Scriptwriting Platform** mit Design-System, Timeline-Editor, Worldbuilding, AI Assistant und Creative Gym.

---

## Quick Start

### Für neue Entwickler
1. **Überblick:** [docs/README.md](../docs/README.md)
2. **Architektur:** [docs/SOURCE_OF_TRUTH.md](../docs/SOURCE_OF_TRUTH.md)

### Backend & Deployment
- **HTTP-API:** Ordner [`functions/`](../functions/) (deployte Services `scriptony-*`)
- **Daten/Storage:** Appwrite (nur serverseitig aus Functions, siehe `functions/_shared/env.ts`)
- **Env (Frontend):** `.env.local.example` und [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)

---

## Projekt-Struktur (Auszug)

```
├── src/                 # Vite/React SPA
│   ├── components/
│   ├── lib/             # API, Auth (Appwrite), Gateway
│   └── docs/            # Kurzverweis → ../docs/
├── functions/           # Scriptony HTTP Functions (Appwrite-Backend)
├── docs/                # Aktuelle Doku
├── docker-compose.yml   # local Appwrite (infra/appwrite)
└── docker-compose.legacy.yml  # optional: Postgres/Lucia local-dev
```

Viele ältere `DEPLOY_*.md` und `PERFORMANCE_*.md` unter `src/` sind **historische Notizen** (früher Supabase); für den aktuellen Stack gelten die Dateien unter **`docs/`**.

---

## Weitere Hinweise

- **PRD / Produkt:** [scriptony-prd.md](./scriptony-prd.md) (wird nachgezogen, wenn sich das Backend ändert)
- **Auth:** `src/lib/auth/` — `AppwriteAuthAdapter`
