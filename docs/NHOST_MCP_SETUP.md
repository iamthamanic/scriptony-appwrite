# Nhost MCP einrichten

Damit Cursor (oder andere MCP-Clients) direkt auf dein Nhost-Projekt zugreifen können – z. B. um Subdomain/Region zu lesen oder `.env.local` zu füllen – musst du den **Nhost MCP Server** einmal installieren und konfigurieren.

## 1. Nhost MCP installieren

Im Terminal:

```bash
sudo curl -L https://raw.githubusercontent.com/nhost/mcp-nhost/main/get.sh | bash
```

Damit wird `mcp-nhost` z. B. unter `/usr/local/bin/mcp-nhost` installiert.

## 2. Konfiguration anlegen

Im **Scriptony-Projektordner** (z. B. `Scriptonyapp` oder das Repo-Root, in dem du `nhost` nutzt):

```bash
cd "/Users/halteverbotsocialmacpro/Desktop/arsvivai/2) DEV PROJEKTE/scriptony_figma make/Scriptonyapp"
mcp-nhost config
```

Der Wizard fragt nach:

- **Cloud** oder **lokal**: Cloud für gehostetes Nhost (app.nhost.io)
- **Personal Access Token (PAT)** oder **Admin Secret**: PAT erstellst du unter [Nhost Dashboard → Settings → Personal Access Tokens](https://app.nhost.io)
- **Subdomain** und **Region** deines Projekts (z. B. `eu-central-1`)

Es entsteht eine Konfigurationsdatei (z. B. `.nhost/mcp-nhost.toml` oder im angegebenen Pfad) mit Einträgen wie:

```toml
[cloud]
pat = 'nhp_...'
enable_mutations = true

[[projects]]
subdomain = 'deine-subdomain'
region = 'eu-central-1'
admin_secret = '...'
allow_queries = ['*']
allow_mutations = ['*']
```

## 3. Cursor MCP-Config

Der Nhost-MCP-Eintrag ist bereits in deiner Cursor-MCP-Config (`~/.cursor/mcp.json`) eingetragen:

```json
"nhost": {
  "command": "/usr/local/bin/mcp-nhost",
  "args": ["start"]
}
```

Falls `mcp-nhost` woanders liegt (z. B. nach Installation mit `npm i -g`), den Pfad anpassen oder z. B. `npx mcp-nhost start` nutzen.

## 4. Cursor neu starten

Cursor einmal vollständig schließen und wieder öffnen, damit der neue MCP-Server geladen wird.

---

**Danach:** Wenn du in Cursor z. B. schreibst „Lies meine Nhost-Projekt-Config und fülle die .env.local“, kann das AI-Tool über den Nhost MCP auf Subdomain, Region und ggf. Schema zugreifen (sofern die TOML-Config und Berechtigungen es erlauben).

- [Nhost MCP Blog](https://nhost.io/blog/introducing-nhost-mcp-server)
- [mcp-nhost auf GitHub](https://github.com/nhost/mcp-nhost)
- [Nhost MCP Configuration (Docs)](https://docs.nhost.io/platform/cli/mcp/configuration)
