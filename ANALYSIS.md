# Scriptonyapp Deployment-Analyse

## Datum: 2026-03-16

## Aktuelle Architektur

### Frontend
- **Framework**: React + Vite
- **Build**: `npm run build` → `build/` (static)
- **Mobile**: Capacitor (iOS/Android)

### Backend (Nhost)
- **Hasura**: GraphQL Engine v2.48.5-ce
- **PostgreSQL**: 14.20
- **Auth**: Nhost Auth v0.44.2
- **Storage**: Nhost Storage v0.11.1
- **Functions**: 13 Serverless Functions
  - scriptony-assistant
  - scriptony-audio
  - scriptony-auth
  - scriptony-beats
  - scriptony-characters
  - scriptony-logs
  - scriptony-project-nodes
  - scriptony-projects
  - scriptony-shots
  - scriptony-stats
  - scriptony-superadmin
  - scriptony-worldbuilding
  - make-server-3b52693b

### Konfiguration
- **Nhost Config**: `nhost/nhost.toml`
- **Easyploy**: `easyploy.json` (nur statisches Hosting)
- **Secrets**: In Nhost Dashboard (nicht im Repo)

## Umgebungsvariablen

### Required
- `VITE_NHOST_SUBDOMAIN`
- `VITE_NHOST_REGION` (default: eu-central-1)

### Optional
- `VITE_NHOST_AUTH_URL`
- `VITE_NHOST_GRAPHQL_URL`
- `VITE_NHOST_STORAGE_URL`
- `VITE_NHOST_FUNCTIONS_URL`
- `VITE_APP_WEB_URL`
- `VITE_AUTH_REDIRECT_URL`
- `VITE_PASSWORD_RESET_REDIRECT_URL`
- `VITE_BACKEND_API_BASE_URL`
- `VITE_BACKEND_PUBLIC_TOKEN`
- `VITE_CAPACITOR_APP_ID`
- `VITE_CAPACITOR_URL_SCHEME`
- `VITE_CAPACITOR_CALLBACK_HOST`

### Secrets (Nhost Dashboard)
- `HASURA_GRAPHQL_ADMIN_SECRET`
- `NHOST_WEBHOOK_SECRET`
- `NHOST_JWT_PUBLIC_KEY`
- `NHOST_JWT_PRIVATE_KEY`
- `NHOST_JWT_KID`
- `GRAFANA_ADMIN_PASSWORD`
- `scriptony_oauth_google_drive_client_secret`

## Deployment-Optionen

### Option A: Nhost Cloud (aktuell)
- `npm run deploy:nhost` - Deploy zu Nhost Cloud
- Vorteile: Managed, automatisch, skalierbar
- Nachteile: Kosten, Vendor-Lock-in

### Option B: Self-Hosted (Easyploy)
- Eigenes Nhost auf VPS deployen
- Vorteile: Kontrolle, Kosten, Datenschutz
- Nachteile: Wartung, Komplexität

## Empfohlene nächste Schritte

1. **Entscheidung**: Nhost Cloud vs Self-Hosted
2. **Wenn Self-Hosted**: Nhost CLI + Docker Compose auf Server
3. **Easyploy-Template erweitern** für Nhost-Deployment
4. **MCP-Server** für automatisches Deployment
5. **CI/CD** mit n8da

## Technische Details

### Build-Prozess
```bash
npm ci
npm run build
# Output: build/ (static files)
```

### Nhost Functions
```bash
# Functions sind in functions/ als Unterverzeichnisse
# Jede Function hat eigene package.json
# Node.js 22
```

### Datenbank
- PostgreSQL 14.20
- Hasura Metadata in `nhost/nhost.toml`
- Migrations sollten in `nhost/migrations/` liegen

## Abhängigkeiten

### Externe Services
- Nhost (Auth, GraphQL, Storage, Functions)
- Google Drive OAuth (optional)
- Grafana (Observability)

### Interne Abhängigkeiten
- 13 Serverless Functions
- Shared Code in `functions/_shared/`
