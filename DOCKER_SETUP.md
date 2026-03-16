# Docker Setup für Scriptony

## PostgreSQL + Hasura

Dieses Docker Compose Setup ersetzt Nhost durch Self-Hosted PostgreSQL und Hasura.

## Schnellstart

```bash
# 1. Environment-Variablen kopieren
cp .env.docker.example .env.docker

# 2. Secrets anpassen (wichtig für Produktion!)
nano .env.docker

# 3. Container starten
docker-compose up -d

# 4. Status prüfen
docker-compose ps
```

## Services

| Service | Port | Beschreibung |
|---------|------|--------------|
| PostgreSQL | 5432 | Datenbank |
| Hasura | 8080 | GraphQL API + Console |

## Zugriff

- **Hasura Console**: http://localhost:8080/console
- **Admin Secret**: Wie in `.env.docker` definiert

## Datenbank-Verbindung

```
Host: localhost
Port: 5432
Database: scriptony
User: scriptony
Password: (aus .env.docker)
```

## Migrationen

Migrationen werden mit Hasura CLI verwaltet:

```bash
# Hasura CLI installieren
curl -L https://github.com/hasura/graphql-engine/raw/stable/cli/get.sh | bash

# Projekt initialisieren (einmalig)
hasura init hasura-migrations

# Migrationen anwenden
hasura migrate apply --endpoint http://localhost:8080 --admin-secret <your-admin-secret>
```

## Backup

```bash
# PostgreSQL Backup
docker exec scriptony-postgres pg_dump -U scriptony scriptony > backup.sql

# Restore
docker exec -i scriptony-postgres psql -U scriptony scriptony < backup.sql
```

## Troubleshooting

### Container starten nicht
```bash
docker-compose logs postgres
docker-compose logs hasura
```

### Datenbank-Verbindung fehlgeschlagen
- Prüfe ob PostgreSQL läuft: `docker-compose ps`
- Prüfe Credentials in `.env.docker`
- Warte 10 Sekunden nach PostgreSQL-Start (Hasura hat Healthcheck)

### Port bereits belegt
```bash
# Prüfe ob Port 5432 oder 8080 frei ist
sudo lsof -i :5432
sudo lsof -i :8080

# Oder ändere Ports in docker-compose.yml
```

## Produktion

Für Produktion:
1. Starke Passwörter verwenden
2. SSL/TLS einrichten
3. Firewall-Regeln konfigurieren
4. Regelmäßige Backups einrichten
5. Monitoring hinzufügen
