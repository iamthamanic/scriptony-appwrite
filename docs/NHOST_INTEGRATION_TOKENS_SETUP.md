# Nhost: Integration-Tokens einrichten

Damit **Option 2** (langlebige API-Tokens für externe Tools wie Blender/ComfyUI) funktioniert, müssen die Datenbank-Migration ausgeführt und die neue Tabelle in Hasura getrackt werden.

---

## 1. Migration anwenden

Die Tabelle `user_integration_tokens` wird durch die Migration angelegt:

**Datei:** `supabase/migrations/2020010100000034_user_integration_tokens.sql`

### Option A: Nhost Dashboard (SQL)

1. Im [Nhost Dashboard](https://app.nhost.io) dein Projekt öffnen.
2. **Database** → **SQL Editor** (oder **Run SQL**).
3. Inhalt von `supabase/migrations/2020010100000034_user_integration_tokens.sql` einfügen und ausführen.

### Option B: Nhost CLI (falls Migrations genutzt werden)

Wenn du Migrations per CLI verwaltest (z. B. `nhost up` mit lokalem Migrations-Ordner):

1. Sicherstellen, dass die Migration im von Nhost erwarteten Ordner liegt (z. B. `nhost/migrations` – siehe [Nhost Docs](https://docs.nhost.io)).
2. `nhost up` ausführen, damit ausstehende Migrations angewendet werden.

Falls dein Projekt bisher nur `supabase/migrations/` nutzt und Nhost keine automatischen Migrations daraus zieht, **Option A** (SQL im Dashboard) ist der direkte Weg.

---

## 2. Tabelle in Hasura tracken

Die Backend-Funktionen nutzen **Hasura GraphQL** (`requestGraphql`). Die neue Tabelle muss daher in Hasura sichtbar sein.

1. Im Nhost Dashboard **Hasura** öffnen (oder deine Hasura-Console-URL).
2. **Data** → **Track table** (oder entsprechende Schaltfläche).
3. Tabelle **`user_integration_tokens`** auswählen und tracken.
4. Keine zusätzlichen Permissions nötig: Die Funktionen laufen mit **Admin Secret** (`x-hasura-admin-secret`) und greifen direkt auf die Tabelle zu.

---

## 3. Prüfen

- In Scriptony: **Einstellungen** → **Integrationen** → **Token erzeugen**. Ein neuer Token sollte erstellt werden.
- Externes Tool: `Authorization: Bearer <token>` an z. B. `POST /shots/:id/upload-image` senden – Request sollte als eingeloggter User durchgehen.

---

## Kurzreferenz

| Schritt | Aktion |
|--------|--------|
| 1 | SQL aus `supabase/migrations/2020010100000034_user_integration_tokens.sql` im Nhost Database SQL Editor ausführen |
| 2 | In Hasura: Tabelle `user_integration_tokens` tracken |
| 3 | App deployen / neu starten; Tokens unter Einstellungen → Integrationen verwalten |
