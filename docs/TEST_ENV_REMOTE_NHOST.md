# Testumgebung: Mac (Frontend) + VPS (Nhost / DB)

**Ja — das ist eure Testumgebung**, sobald:

1. Auf dem **VPS** der offizielle Nhost-**Docker-Compose**-Stack läuft (Auth, Hasura, Postgres, Storage, Functions, …).
2. Auf dem **Mac** nur **`npm run dev`** (Vite, Port **3000**) mit **`/.env.local`**, die **`VITE_NHOST_*`** auf die Nhost-URLs zeigt (z. B. `http://local.auth.local.nhost.run/v1`).

## Was wohin geht

| Komponente | Wo es läuft | Erreichbarkeit vom Mac |
|------------|-------------|-------------------------|
| **Browser / React-App** | Mac (`localhost:3000`) | — |
| **Auth (Login, JWT)** | VPS (Nhost `auth`-Container) | HTTP(S) zu `VITE_NHOST_AUTH_URL` |
| **GraphQL / Hasura** | VPS | HTTP(S) zu `VITE_NHOST_GRAPHQL_URL` |
| **Postgres** | VPS **nur im Docker-Netz** | Der Mac hat **keine** direkte DB-Verbindung — korrekt so. |

**Kurz:** `localhost` „spricht“ mit dem Server **über HTTP** (Auth + GraphQL), **nicht** mit Postgres. Wenn Auth oder GraphQL „nicht geht“, liegt es fast immer an **DNS/Hosts**, **Firewall**, **fehlender `.env.local`** oder **Auth-Config** (Redirects, Signup, User in `auth.users`) — nicht daran, dass „die DB fehlt“.

## Einmal prüfen (auf dem Mac, im Repo-Root)

```bash
npm run verify:test-env
```

Das liest **`.env.local`** und ruft **Health-Checks** für Auth und Hasura auf.

## Erste Nutzer

Ohne Self-Registration im UI: User müssen in **Nhost Auth** existieren — siehe **[NHOST_SELFHOSTED_USERS.md](NHOST_SELFHOSTED_USERS.md)** und **`scripts/nhost-signup-email-password.sh`**.

## Verwechslung vermeiden

- **`docker compose --profile local-dev`** im **Scriptony-Repo** = separates **Mini-Backend** (eigenes Postgres) — **das ist nicht** dieselbe DB wie auf dem Nhost-VPS.
- **Nhost auf dem VPS** = die **eigentliche** Test-/Ziel-Backend-Instanz für die App mit **`VITE_NHOST_*`**.

Siehe auch **[SOURCE_OF_TRUTH.md](SOURCE_OF_TRUTH.md)**.
