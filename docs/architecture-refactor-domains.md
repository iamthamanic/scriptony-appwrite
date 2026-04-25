# Architecture Refactor – Ziel-Domaenen

Stand: 2026-04-24

Dieses Dokument enthaelt die Ziel-Domaenen fuer die Architektur-Refactor-Phasen.
Es wird von `docs/scriptony-architecture-refactor-master.md` referenziert.

---

## scriptony-storage

scriptony-storage besitzt physische Speicherziele, Storage Provider, Storage-OAuth, Storage-Verbindungen, Storage Objects, Sync, Import und Export.

**Zweck:**
scriptony-storage beantwortet:
- Wo liegt eine Datei physisch?
- Welcher Storage Provider wird genutzt?
- Welcher OAuth-/Provider-Account ist verbunden?
- Welches Storage Target gilt fuer User, Organisation oder Projekt?
- Welche externe File-ID gehoert zu welchem Asset?
- Ist eine Datei synchronisiert?
- Wie wird ein Projekt als JSON/Dateistruktur exportiert oder importiert?

**Enthaelt:**
- Storage Provider (Appwrite Storage, Google Drive, Dropbox, OneDrive)
- Storage Provider OAuth
- Storage Connections
- Storage Targets
- Storage Objects
- External File Mapping
- Sync Status
- Import/Export
- Project Snapshot Storage
- Storage Health

**Datenmodelle:**

```typescript
// storage_connections
{
  id: string,
  user_id: string,
  provider: 'appwrite' | 'google_drive' | 'dropbox' | 'onedrive',
  status: 'active' | 'expired' | 'revoked',
  scopes: string[],
  access_token_ref: string,
  refresh_token_ref: string,
  expires_at: datetime,
  metadata: object,
  created_at: datetime,
  updated_at: datetime
}

// storage_targets
{
  id: string,
  owner_type: 'user' | 'organization' | 'project',
  owner_id: string,
  provider: string,
  connection_id: string,
  root_path: string,
  format: 'flat' | 'hierarchical',
  status: 'active' | 'paused' | 'error',
  metadata: object,
  created_at: datetime,
  updated_at: datetime
}

// storage_objects
{
  id: string,
  asset_id: string,        // Verweis auf scriptony-assets
  project_id: string,
  provider: string,
  connection_id: string,
  external_file_id: string,
  bucket_id: string,
  path: string,
  checksum: string,
  size: number,
  mime_type: string,
  sync_status: 'synced' | 'pending' | 'error' | 'conflict',
  last_synced_at: datetime,
  metadata: object,
  created_at: datetime,
  updated_at: datetime
}
```

**Grenze zu scriptony-assets:**
- **scriptony-assets** = fachliche Asset-Metadaten (Dieses Asset ist ein TTS-Audio fuer Script Block X)
- **scriptony-storage** = physische Dateiablage (Diese Datei liegt in Google Drive mit external_file_id abc123)

**Regel:**
Assets duerfen nicht dauerhaft Google-Drive-OAuth, Dropbox-OAuth oder Provider-Token-Logik enthalten.
Storage darf nicht die fachliche Asset-Bedeutung besitzen.

**Spaetere Routen:**
- `GET /storage/providers`
- `POST /storage/providers/:provider/oauth/start`
- `GET /storage/providers/:provider/oauth/callback`
- `GET /storage/targets`
- `POST /storage/targets`
- `POST /storage/write`
- `POST /storage/read`
- `POST /storage/sync`
- `POST /storage/export-project`
- `POST /storage/import-project`

---

## scriptony-collaboration

scriptony-collaboration besitzt Projektfreigaben, Mitglieder, Rollen, Einladungen, Organisationen/Workspaces und Access Checks.

**Wichtig:** Direkte Projektfreigabe ohne Organisation muss moeglich sein.

**Zwei Kollaborationsmodi:**

1. **Direct Project Sharing**: User A teilt ein Projekt direkt mit User B.
2. **Organization / Workspace Sharing**: Ein Projekt gehoert einer Organisation. Organisationsmitglieder erhalten Zugriff gemaess Rolle.

**Datenmodelle:**

```typescript
// projects (Erweiterung)
{
  id: string,
  owner_type: 'user' | 'organization',
  owner_id: string,        // user_id oder organization_id
  created_by: string,
  title: string,
  project_type: string,
  visibility: 'private' | 'shared' | 'public',
  created_at: datetime,
  updated_at: datetime
}

// project_members
{
  id: string,
  project_id: string,
  user_id: string,
  role: 'owner' | 'editor' | 'viewer',
  status: 'active' | 'pending',
  invited_by: string,
  created_at: datetime,
  updated_at: datetime
}

// project_invites
{
  id: string,
  project_id: string,
  email: string,
  role: 'editor' | 'viewer',
  token_hash: string,
  status: 'pending' | 'accepted' | 'rejected' | 'expired',
  invited_by: string,
  expires_at: datetime,
  created_at: datetime,
  updated_at: datetime
}

// organization_members
{
  id: string,
  organization_id: string,
  user_id: string,
  role: 'owner' | 'admin' | 'editor' | 'viewer',
  status: 'active' | 'pending',
  invited_by: string,
  created_at: datetime,
  updated_at: datetime
}

// organization_invites
{
  id: string,
  organization_id: string,
  email: string,
  role: string,
  token_hash: string,
  status: 'pending' | 'accepted' | 'rejected' | 'expired',
  invited_by: string,
  expires_at: datetime,
  created_at: datetime,
  updated_at: datetime
}
```

**Access-Helper:**

```typescript
// Zukuenftige Helper-Implementierung
canReadProject(userId: string, projectId: string): Promise<boolean>
canEditProject(userId: string, projectId: string): Promise<boolean>
canManageProject(userId: string, projectId: string): Promise<boolean>
```

**Initiale Implementierung (Single-User):**
```typescript
// Initial darf der Helper noch created_by pruefen
async function canEditProject(userId, projectId) {
  const project = await getProject(projectId);
  return project.created_by === userId;
}
```

**Ziel-Implementierung (Multi-User):**
```typescript
// Spaetere Erweiterung
canEditProject =
  project.owner_type === 'user' && project.owner_id === userId
  OR project.owner_type === 'organization' && isOrgMemberWithEdit(userId, project.owner_id)
  OR hasProjectRole(userId, projectId, ['owner', 'editor', 'admin'])
```

**Spaetere Routen:**
- `GET /collaboration/projects/:projectId/members`
- `POST /collaboration/projects/:projectId/invites`
- `PATCH /collaboration/projects/:projectId/members/:userId`
- `DELETE /collaboration/projects/:projectId/members/:userId`
- `POST /collaboration/invites/:inviteId/accept`
- `POST /collaboration/invites/:inviteId/reject`
- `GET /collaboration/organizations`
- `POST /collaboration/organizations`
- `POST /collaboration/access/check`

**Grenze zu scriptony-auth:**
- **scriptony-auth** = Identitaet, Signup, Login, Account Basics
- **scriptony-collaboration** = Wer darf in welchem Projekt welche Aktionen ausfuehren?
