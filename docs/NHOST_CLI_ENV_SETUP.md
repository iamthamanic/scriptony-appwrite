# Nhost per CLI einrichten und .env.local erzeugen

Du kannst die Nhost-Anbindung (Subdomain, Region, URLs) komplett über die **Nhost CLI** erledigen. Danach schreibt ein Skript die `.env.local` automatisch.

## 1. Nhost CLI installieren

Einmalig im Terminal:

```bash
sudo curl -L https://raw.githubusercontent.com/nhost/nhost/main/cli/get.sh | bash
```

(Sudo-Passwort eingeben. Danach ist `nhost` verfügbar.)

## 2. Anmelden

Im **Scriptony-Projektordner**:

```bash
cd "/Users/halteverbotsocialmacpro/Desktop/arsvivai/2) DEV PROJEKTE/scriptony_figma make/Scriptonyapp"
nhost login
```

- **Mit E-Mail + Passwort:** E-Mail und Passwort von deinem Nhost-Konto eingeben.
- **Nur GitHub-Login / Passwort wird abgelehnt:** Statt Passwort einen **Personal Access Token (PAT)** verwenden (siehe unten).

### Login mit Personal Access Token (PAT)

Wenn du dich bei Nhost nur mit GitHub anmeldest oder das gesetzte Passwort bei `nhost login` als „falsch“ gemeldet wird:

1. Im [Nhost Dashboard](https://app.nhost.io) einloggen → **Profil/Settings** → **Personal Access Tokens** (oder [direkt](https://app.nhost.io/settings)).
2. **Create token** – Namen vergeben (z.B. „CLI“), Token erstellen und **kopieren** (wird nur einmal angezeigt).
3. Im Terminal:
   ```bash
   nhost login --pat DEIN_TOKEN
   ```
   (Token einfügen statt `DEIN_TOKEN`; E-Mail ggf. trotzdem eingeben, wenn gefragt.)

Damit umgehst du das E-Mail/Passwort-Login; der PAT reicht für die CLI.

## 3. Projekt verknüpfen

```bash
nhost link
```

- Workspace-Nummer wählen (z.B. `1`).
- Subdomain deines Projekts zur Bestätigung eintippen (wird in der Liste angezeigt).

## 4. Config aus der Cloud holen

```bash
nhost config pull
```

- Bestehende Dateien überschreiben, wenn gefragt (z.B. `y`).
- Danach liegen u.a. `nhost/nhost.toml` und ggf. `.nhost/nhost.toml` mit Subdomain und Region.

## 5. .env.local aus Config erzeugen

```bash
npm run env:from-nhost
```

Das Skript liest Subdomain und Region aus der Nhost-Config und schreibt die komplette `.env.local` (Auth-, GraphQL-, Storage-, Functions-URLs) für die Scriptony-App.

## 6. Dev-Server starten

```bash
npm run dev
```

App z.B. unter `http://localhost:3001` öffnen – Login läuft dann gegen dein Nhost-Projekt.

---

**Kurz:**  
`nhost login` → `nhost link` → `nhost config pull` → `npm run env:from-nhost` → `npm run dev`

---

## 7. Deploy per CLI (Functions)

Nhost baut Deployments aus dem **verbundenen GitHub-Repo**. Du kannst ein Deployment von der CLI aus anstoßen:

1. **Änderungen pushen:**  
   `git add .` → `git commit -m "..."` → `git push origin main` (bzw. dein Branch).

2. **Deployment starten (im Scriptony-App-Ordner):**  
   ```bash
   cd "/Users/halteverbotsocialmacpro/Desktop/arsvivai/2-DEV-PROJEKTE/scriptony_figma make/Scriptonyapp"
   npm run deploy:nhost
   ```
   Das nutzt den aktuellen Git-Branch und wartet auf den Deployment-Abschluss (`--follow`).

**Hinweis:** Nur die **Funktionen (Code)** werden so deployed. **Env-Variablen** (z. B. `scriptony_oauth_callback_url`, Google/Dropbox-Keys) legst du im Nhost Dashboard an; sie werden nicht aus dem Repo deployed. Nach dem Anlegen neuer Env-Vars reicht oft ein erneutes Deployment oder ein Neustart der Functions, damit sie geladen werden.
