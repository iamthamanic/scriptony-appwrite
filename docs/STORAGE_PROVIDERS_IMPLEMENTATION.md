# Speicheranbieter – Implementierung & Datenmodell

Option A: **Backend nutzt nur Scriptony Cloud (Appwrite).** Alle anderen Anbieter (Google Drive, Dropbox, OneDrive, KDrive, Hetzner, Lokal) laufen **rein im Client** – OAuth-Token bleibt beim Nutzer, die App spricht direkt mit der API des Anbieters.

---

## 1. Was wird wo gespeichert?

### Bei Scriptony Cloud (Standard)

- **Appwrite Databases:** Projekte, Welten, Episodes, Characters, Scenes, Shots, Nodes, Beats, Organisationen, User, etc.
- **Appwrite Storage (Buckets):** Bilder (Projekt-Cover, World-Cover, Shot-Bilder, Character-Avatare), Audio-Dateien.
- Ablage ist pro Ressource (z.B. `projects.cover_image_url` → URL zu Appwrite Storage).

### Bei externen Anbietern (Google Drive, KDrive, Hetzner, Lokal, …)

Pro **Nutzer** ein **Stammordner** (z.B. `Scriptony`), darunter pro **Projekt** ein Ordner. In jedem Projektordner:

| Inhalt | Format | Beispiel |
|--------|--------|----------|
| **Projekt-Metadaten** | JSON | `project.json` (Titel, Typ, Logline, Erstellungsdatum, …) |
| **Struktur (Acts/Scenes/Nodes)** | JSON | `structure.json` oder in `project.json` integriert |
| **Beats** | JSON | `beats.json` |
| **Bilder** | Dateien | `assets/images/<id>.<ext>` (Cover, Shot-Bilder, …) |
| **Audio** | Dateien | `assets/audio/<id>.<ext>` |

Optional: Welten, Characters etc. als weitere JSON-Dateien oder in einem `data/`-Unterordner.

**Vorteil:** Alles in einem Ordner pro Projekt – Nutzer kann den Ordner sichern, verschieben oder in einem anderen Anbieter spiegeln.

---

## 2. Was muss pro Anbieter gemacht werden?

Gemeinsam für alle (außer Scriptony Cloud):

1. **Storage-Adapter** implementieren (Interface aus `src/lib/storage-provider/types.ts`):
   - `connect(config)` – OAuth-Token oder Zugangsdaten setzen
   - `listContainers()` – z.B. Unterordner von „Scriptony“ = Projekte
   - `getOrCreateContainer(name)` – Projektordner anlegen oder öffnen
   - `uploadFile`, `downloadFile`, `getFileUrl`, `deleteFile`, `listFiles`
   - `readJson`, `writeJson` – für Projekt-/Struktur-JSON
   - **`getStorageUsage()`** (optional) – liefert `StorageUsageInfo` (usedBytes, totalBytes?, fileCount?), damit im Speicher-Tab die belegte Speichermenge angezeigt werden kann, sobald der Anbieter verbunden ist.
2. **UI:** Beim ersten Nutzen des Anbieters: OAuth (oder Ordner-Auswahl bei Lokal), dann Token/Handle nur im Speicher der App (z.B. SessionStorage oder Memory), **nicht** ans Backend senden.
3. **App-Logik:** Wenn der gewählte Speicher **nicht** Scriptony Cloud ist: Lade/Speichere Projekte und Dateien **nur** über den jeweiligen Adapter (kein Aufruf von Scriptony-Projekt-/Storage-Routen für diese Projekte).

---

### Google Drive

- **API:** [Google Drive API v3](https://developers.google.com/drive/api/guides/about-sdk) (REST).
- **OAuth:** OAuth 2.0 im Browser (Popup oder Redirect). Scopes z.B. `https://www.googleapis.com/auth/drive.file` (nur von der App erstellte Dateien).
- **Schritte:**
  1. In [Google Cloud Console](https://console.cloud.google.com/) ein Projekt anlegen, Drive API aktivieren, OAuth-Client (Web) mit Redirect-URI anlegen.
  2. Im Frontend: Login-Button „Mit Google Drive verbinden“ → OAuth-Flow → Access Token (und ggf. Refresh Token) im Speicher halten.
  3. Adapter: Ordner „Scriptony“ im Root oder in einem vom Nutzer gewählten Ordner anlegen; darin pro Projekt einen Ordner; darin `project.json`, `structure.json`, `assets/…`.
  4. Dateien: `files.create` mit `multipart/related` für Uploads, `files.get` mit `alt=media` für Downloads, `webContentLink` oder temporäre Links für Anzeige.
- **Token:** Nur im Client (SessionStorage oder Memory), Refresh bei Ablauf mit Refresh Token.

---

### Dropbox

- **API:** [Dropbox API v2](https://www.dropbox.com/developers/documentation/http/documentation) (REST).
- **OAuth:** OAuth 2.0 (Authorization Code Flow), Scopes z.B. `files.metadata.write`, `files.content.write`, `files.content.read`.
- **Schritte:**
  1. In [Dropbox App Console](https://www.dropbox.com/developers/apps) App anlegen, Berechtigungen setzen.
  2. Frontend: „Mit Dropbox verbinden“ → OAuth → Access Token clientseitig speichern.
  3. Adapter: Ordner `/Scriptony/<projekt-id>/` anlegen; darin `project.json`, `structure.json`, `assets/images/`, `assets/audio/`.
  4. Upload: `files/upload`, Download: `files/download`, Links: `sharing/create_shared_link_with_settings` oder temporäre Links.
- **Token:** Nur im Client.

---

### OneDrive

- **API:** [Microsoft Graph – OneDrive](https://learn.microsoft.com/en-us/graph/api/resources/onedrive).
- **OAuth:** Microsoft Identity Platform (OAuth 2.0), Scopes z.B. `Files.ReadWrite.AppFolder` oder `Files.ReadWrite`.
- **Schritte:**
  1. In [Azure Portal](https://portal.azure.com/) App-Registrierung, Microsoft Graph-Berechtigungen für OneDrive.
  2. Frontend: „Mit OneDrive verbinden“ → MS Login → Access Token clientseitig speichern.
  3. Adapter: Ordner `Scriptony` im Root; darin pro Projekt ein Ordner; darin `project.json`, `structure.json`, `assets/`.
  4. Upload: `PUT /me/drive/root:/path/file:/content`, Download: `GET .../content`, Links über `createLink`.
- **Token:** Nur im Client, Refresh über MSAL wenn nötig.

---

### KDrive (Infomaniak)

- **API:** [KDrive API](https://developer.infomaniak.com/docs/kdrive) (REST, OAuth 2.0).
- **OAuth:** Infomaniak OAuth (Authorization Code). Scopes je nach Doku (z.B. Lese/Schreib auf KDrive).
- **Schritte:**
  1. Bei [Infomaniak Developer](https://developer.infomaniak.com/) App anlegen, Redirect-URI und Scopes konfigurieren.
  2. Frontend: „Mit KDrive verbinden“ → OAuth → Access Token clientseitig speichern.
  3. Adapter: Root-Ordner „Scriptony“, darin Projektordner mit `project.json`, `structure.json`, `assets/` – analog zu Drive/Dropbox (API-Endpunkte aus KDrive-Doku verwenden).
  4. Upload/Download/Links: gemäß KDrive API (Dateien erstellen, lesen, ggf. geteilte Links).
- **Token:** Nur im Client.

---

### Hetzner Cloud Storage

- **API:** [Hetzner Object Storage](https://docs.hetzner.com/storage/object-storage/) – **S3-kompatibel** (REST mit AWS Signature v4).
- **Verbindung:** **Kein OAuth.** Nutzer erstellt im Hetzner Robot/Cloud Console einen **Access Key** und **Secret Key** und trägt beide in der App ein (z. B. Einstellungen → Speicher → „Hetzner verbinden“).
- **Schritte:**
  1. Nutzer legt in Hetzner einen Bucket an (oder die App nutzt einen festen Bucket-Namen wie `scriptony`).
  2. Frontend: „Mit Hetzner verbinden“ → Eingabefelder für Endpoint (z. B. `https://fsn1.your-objectstorage.com`), Bucket, Access Key, Secret Key → Credentials nur im Client speichern (z. B. SessionStorage oder Memory).
  3. Adapter: S3-kompatible Aufrufe (z. B. mit `@aws-sdk/client-s3` oder fetch + Signing). Prefix/„Ordner“ im Bucket z. B. `Scriptony/<projekt-id>/project.json`, `.../assets/images/...`.
  4. Upload/Download: S3 PUT/GET; URLs: Presigned URLs für temporären Zugriff.
- **Token:** Access Key + Secret Key nur im Client, kein OAuth.

---

### Lokal (Dieser Rechner)

- **API:** [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) (Browser), oder reines **IndexedDB** ohne Ordner-Auswahl.
- **Varianten:**
  1. **Ordner wählen:** Nutzer klickt „Ordner auswählen“ → `showDirectoryPicker()` → Handle im Speicher (oder in IndexedDB serialisiert, je nach Browser). Lese/Schreib über `getFileHandle()`, `createWritable()` usw. Nur in unterstützten Browsern (Chrome, Edge).
  2. **Nur IndexedDB:** Kein Ordner-Picker; alle Projekt-JSONs und Blobs (Bilder, Audio) in IndexedDB (z.B. Dexie.js). Kein Zugriff von außen, aber offline-fähig und geräte-lokal.
- **Schritte:**
  1. UI: „Lokal nutzen“ → entweder „Ordner wählen“ (File System Access) oder „Nur auf diesem Gerät (IndexedDB)“.
  2. Adapter: Entweder Dateien im gewählten Ordner anlegen (`Scriptony/<projekt-id>/project.json` usw.) oder Keys in IndexedDB wie `project/<id>`, `assets/<id>`.
  3. Kein OAuth; Handle bzw. IndexedDB-Daten nur im aktuellen Browser-Tab/Kontext.
- **Einschränkung:** File System Access wird von Safari/Firefox teils nicht oder eingeschränkt unterstützt; dann nur IndexedDB-Variante anbieten.

---

## 3. Reihenfolge im Code

1. **Interface:** `StorageProvider` in `types.ts` ist bereits vorbereitet (siehe frühere Blaupause).
2. **Adapter pro Anbieter:** z.B. `src/lib/storage-provider/adapters/google-drive.ts`, `dropbox.ts`, `onedrive.ts`, `kdrive.ts`, `local.ts` – jede Klasse implementiert das Interface.
3. **Registry:** Adapter in der Registry registrieren; UI liest `listStorageProviders()` und zeigt nur Anbieter mit `comingSoon: false` als wählbar.
4. **OAuth-/Connect-UI:** Im Speicher-Tab oder beim ersten Speichern: „Mit [Anbieter] verbinden“ → Token/Handle setzen → `adapter.connect(config)`.
5. **Projekt-Lade-/Speicher-Logik:** Wenn `getSelectedStorageProviderId() !== 'scriptony_cloud'`: Projektliste und Projektinhalte ausschließlich über den gewählten Adapter laden/speichern; keine Scriptony-Projekt-/Storage-API für diese Projekte aufrufen.

---

## 4. Speichernutzung pro Anbieter (wenn verbunden)

Wenn ein Anbieter verbunden ist, kann die App die **belegte Speichermenge** anzeigen. Dafür implementiert der Adapter optional `getStorageUsage(): Promise<StorageUsageInfo>` (Typ in `src/lib/storage-provider/types.ts`: `usedBytes`, optional `totalBytes`, `fileCount`).

| Anbieter | Wie die Nutzung ermittelt wird |
|----------|---------------------------------|
| **Scriptony Cloud** | Bereits umgesetzt: Backend-API `/storage/usage` liefert Gesamtgröße und Dateianzahl. |
| **Google Drive** | [About – storageQuota](https://developers.google.com/drive/api/reference/v3/about#resource-representations): `storageQuota.limit` und `storageQuota.usage` (in Bytes). Oder nur unser Scriptony-Ordner: `listFiles` rekursiv und Größen summieren. |
| **Dropbox** | [space_usage](https://www.dropbox.com/developers/documentation/http/documentation#users-space_usage): `used` und `allocation.allocated` (in Bytes). Optional nur unser Ordner: Dateien auflisten und summieren. |
| **OneDrive** | [Drive quota](https://learn.microsoft.com/en-us/graph/api/drive-get?view=graph-rest-1.0): `quota.used` und `quota.total`. |
| **KDrive** | Laut KDrive-API-Doku: Quota-/Usage-Endpunkt nutzen oder eigene Dateien auflisten und Größen summieren. |
| **Hetzner (S3)** | Kein Kontingent im klassischen Sinn. Nur **von Scriptony belegt**: Liste aller Objekte unter Prefix `Scriptony/` und Summe der `ContentLength` → „Scriptony belegt X MB“. |
| **Lokal** | File System Access: Größe des gewählten Ordners (rekursiv summieren) oder geschätzt. IndexedDB: `navigator.storage.estimate().usage` oder Summe der gespeicherten Blob-Größen. |

Die UI im Speicher-Tab zeigt bei Scriptony Cloud die aktuelle Nutzung; bei anderen Anbietern einen Hinweis, dass die Nutzung angezeigt wird, sobald der Anbieter verbunden ist. Sobald ein Adapter `getStorageUsage()` implementiert und der Nutzer verbunden ist, kann dieselbe Anzeige („X verwendet von Y“, Fortschrittsbalken, Dateianzahl) für diesen Anbieter genutzt werden.

---

## 5. Weitere Anbieter in der App

- **KDrive** ist in der Registry unter der ID `kdrive` eingetragen. Nach Implementierung des Adapters und `comingSoon: false` kann der Nutzer KDrive als Speicherort wählen.
- **Hetzner Cloud Storage** ist unter der ID `hetzner` eingetragen (S3-kompatibel, Verbindung per Access Key + Secret). Adapter nutzt S3-API; Datenstruktur wie bei den anderen Anbietern (`Scriptony/<projekt-id>/project.json`, `assets/`, …).

Speichernutzung: Siehe Abschnitt 4; Typ `StorageUsageInfo` in `src/lib/storage-provider/types.ts`.
