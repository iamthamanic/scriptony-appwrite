# Smoke Test Matrix

Stand: 2026-04-08

Dieses Dokument definiert die feste Smoke-Matrix fuer reale, authentifizierte User-Flows. Die Matrix ergaenzt `npm run verify:parity` und ist bewusst strenger: sie prueft nur echte Read-Flows mit Bearer-Token und faellt ohne Auth-Token hart aus.

## Ziele

- kritische User-Flows statt nur `/health`
- auth-geschuetzte Endpunkte als Pflicht
- Projects und Worldbuilding immer enthalten
- mindestens ein AI-bezogener Flow
- lokal und gegen live Appwrite von derselben Maschine aus anwendbar

## Ausfuehrung

Direkt gegen die in [`.env.local`](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/.env.local) hinterlegten Function-Domains:

```bash
npm run smoke:user-flows
```

Ueber den lokalen Vite-Dev-Proxy:

```bash
npm run smoke:user-flows -- --mode=dev-proxy --frontend-origin=http://127.0.0.1:3000
```

Nur die definierte Matrix anzeigen:

```bash
npm run smoke:user-flows -- --list
```

## Voraussetzungen

- `SCRIPTONY_SMOKE_BEARER_TOKEN` in [`.env.server.local`](/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony-appwrite/.env.server.local) oder im Shell-Environment
- fuer `--mode=dev-proxy` ein laufender lokaler Dev-Server mit `__dev-proxy`

## Matrix

| Flow ID                        | User Journey                                                   | Route               | Function                  | Erwartung                             |
| ------------------------------ | -------------------------------------------------------------- | ------------------- | ------------------------- | ------------------------------------- |
| `auth_profile_read`            | App-Start kann Profil laden                                    | `/profile`          | `scriptony-auth`          | JSON mit `profile`                    |
| `projects_list_read`           | Projects-Seite laedt                                           | `/projects`         | `scriptony-projects`      | JSON mit `projects[]`                 |
| `worlds_list_read`             | Worldbuilding-Seite laedt                                      | `/worlds`           | `scriptony-worldbuilding` | JSON mit `worlds[]`                   |
| `assistant_settings_read`      | Assistant kann Chat-Settings laden                             | `/ai/settings`      | `scriptony-ai`            | JSON mit `settings`                   |
| `assistant_conversations_read` | Assistant kann Chat-Historie laden                             | `/ai/conversations` | `scriptony-ai`            | JSON mit `conversations[]`            |
| `ai_integrations_read`         | Settings > Integrations kann Provider- und Feature-Daten laden | `/settings`         | `scriptony-ai`            | JSON mit `providers[]` und `features` |

## Abgrenzung zu `verify:parity`

- `verify:parity` prueft Deployments, Vars, Routing und pro Service einen Minimal-Read.
- `smoke:user-flows` prueft eine feste User-Flow-Matrix.
- Beide Skripte sind absichtlich getrennt, damit Infrastruktur-Paritaet und Produkt-Readiness nicht vermischt werden.
