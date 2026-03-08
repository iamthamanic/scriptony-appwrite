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

- E-Mail und Passwort von deinem **Nhost-Konto** eingeben.
- Wenn du dich bei Nhost nur mit GitHub einloggst: Im [Nhost Dashboard](https://app.nhost.io) unter **Settings → Account** ein Passwort setzen, dann dasselbe bei `nhost login` nutzen.

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
