# Nhost Self-Hosted: Nutzer ohne Self-Registration

## Warum „User in der DB“ oft scheitert

1. **Login prüft nur Nhost Auth** (`auth.users` mit **bcrypt**-Passwort). Ein Eintrag nur in **`public.users`** (Scriptony/Hasura) reicht **nicht** — ohne gültigen Auth-Record gibt es **kein** gültiges Passwort-Login.
2. **Klartext-Passwort** in SQL einfügen funktioniert **nicht** — es muss ein **bcrypt-Hash** sein (wie Nhost ihn erwartet).
3. **`AUTH_EMAIL_SIGNIN_EMAIL_VERIFIED_REQUIRED=true`** (oder in `nhost.toml` `emailVerificationRequired = true`): Nutzer mit `email_verified = false` können **nicht** einloggen, bis die E-Mail verifiziert ist (bei Docker-Demo: Mail unter **Mailhog** abholen oder Spalte setzen).
4. **`AUTH_DISABLE_SIGNUP=true`**: Öffentlicher `POST /v1/signup/email-password` wird **abgelehnt**. Dann hilft weder Dashboard-„Sign up“ noch unser Curl, solange Signup aus ist — außer du legst Nutzer per **SQL/Import** korrekt an oder schaltest Signup **vorübergehend** an.
5. **Self-Hosted-Dashboard** ist eingeschränkt; „User anlegen“ kann fehlschlagen oder unklar sein — die **Auth-API** oder **Postgres** sind oft zuverlässiger.

## Nhost CLI & MCP

- **`nhost` CLI (lokal)** hat **keinen** Befehl wie `nhost user create` für deinen Docker-Stack.
- **Cursor MCP `user-nhost`**: war in der Umgebung **nicht nutzbar** (Server-Fehler). Selbst wenn es lief, ist es primär für **Nhost Cloud** gedacht, nicht für beliebige Self-Hosted-URLs.

Praktisch: **curl** (Signup-API), **psql** (+ bcrypt), oder Signup kurz aktivieren.

## Empfohlener Weg A — Signup kurz erlauben, User anlegen, wieder sperren

Auf dem Server in `docker-compose.override.yml` beim Service **`auth`** (nur temporär):

```yaml
      AUTH_DISABLE_SIGNUP: "false"
```

Dann auf dem **Mac** (oder Server mit `curl`):

```bash
./scripts/nhost-signup-email-password.sh you@example.com 'Mind.9Zeichen!'
```

Oder manuell:

```bash
curl -sS -X POST "http://local.auth.local.nhost.run/v1/signup/email-password" \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"Mind.9Zeichen!","options":{"defaultRole":"user","displayName":"You"}}'
```

Danach optional wieder `AUTH_DISABLE_SIGNUP: "true"` und `docker compose up -d`.

**Hinweis:** Im offiziellen Docker-`.env.example` steht `AUTH_EMAIL_SIGNIN_EMAIL_VERIFIED_REQUIRED=false` — dann reicht Signup meist ohne Mail-Klick.

## Weg B — Nutzer wirklich „nur per DB“

1. Auf dem Server Schema ansehen:

   ```bash
   docker exec -it docker-compose-postgres-1 psql -U postgres -c "\d auth.users"
   ```

2. **bcrypt-Hash** erzeugen (Python, einmalig `pip install bcrypt` oder im Container):

   ```bash
   python3 -c "import bcrypt; print(bcrypt.hashpw(b'DeinPasswort9+', bcrypt.gensalt(rounds=10)).decode())"
   ```

3. **`INSERT`** in **`auth.users`** mit allen **NOT NULL**-Spalten (inkl. `email_verified` wenn nötig). UUID z. B. mit `gen_random_uuid()`.

Siehe auch [Nhost — Users (Import)](https://docs.nhost.io/products/auth/users).

## Scriptony: Profil / Organisation

Nach erfolgreichem **Nhost-Login** legt die App bei Bedarf Daten in **`public.users`** / Org an (z. B. über Functions wie `ensureUserBootstrap`). Wenn **Login** schon fehlschlägt, liegt es fast immer an **Auth** (Punkte oben), nicht an Scriptony-Tabellen.

## Demo-Function (`create-demo-user`)

Ruft intern **`/signup/email-password`** auf — funktioniert **nicht**, wenn Signup disabled ist. Default-Passwort in Code ist **`demo123456`** (6 Zeichen) — **unter** dem Standard **`AUTH_PASSWORD_MIN_LENGTH: 9`** des Docker-Beispiels; für Demos ein längeres Passwort per Env setzen (`SCRIPTONY_DEMO_PASSWORD`).
