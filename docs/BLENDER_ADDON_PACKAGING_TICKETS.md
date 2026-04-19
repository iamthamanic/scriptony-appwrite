# Blender Add-on Packaging Tickets

Stand: 2026-04-19

## Ticket 1: Packaging-Entrypoints vereinheitlichen

Status: `completed`

- `package.json` soll auf `scripts/build-blender-addon.sh` zeigen.
- `scripts/create-addon-zip.sh` bleibt nur als Kompatibilitäts-Wrapper bestehen.
- Der Legacy-Build soll sowohl `scriptony_blender_addon.zip` als auch den Alias `scriptony-blender-addon.zip` aktualisieren.

## Ticket 2: Dokumentation und Download-Flows bereinigen

Status: `completed`

- README sauber zwischen Legacy- und Extension-ZIP unterscheiden.
- UI und Terminal-Hinweise auf die aktuellen Dateinamen und Build-Befehle umstellen.
- Legacy als Sofort-Variante, Extension als Blender-4.2+-Variante klar ausweisen.

## Ticket 3: Add-on-Verifikation automatisieren

Status: `completed`

- Build-Verifikation für beide ZIPs ergänzen.
- Legacy `register()`/`unregister()` reproduzierbar prüfen.
- Optionalen Blender-Smoke-Test unterstützen, wenn Blender lokal verfügbar ist.

## Ticket 4: Alten `blender-addon/`-Pfad stilllegen

Status: `completed`

- Den doppelten Quellbaum als Legacy-Pfad aus dem aktiven Flow entfernen.
- Im Repo klar machen, dass `scriptony_blender_addon/` die einzige Source of Truth ist.

Hinweis:

- Der optionale Blender-CLI-Smoke-Test bleibt per `RUN_BLENDER_SMOKE=1` aktivierbar.
- Der nackte Headless-Start von Blender funktioniert lokal, aber der Import-Lauf crasht in dieser Umgebung vor einem Python-Traceback.
