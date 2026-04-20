# KI-Einstellungen — User Guide

Stand: 2026-04-15

## Übersicht

Unter **KI & LLM** in den Einstellungen kannst du für jeden Anwendungsbereich einen eigenen KI-Provider und ein eigenes Modell wählen. Du brauchst mindestens einen API-Key, um KI-Features zu nutzen.

## API-Key hinterlegen

1. Wähle den gewünschten Bereich (z.B. **Assistant Chat**)
2. Klicke auf das gewünschte Provider-Feld
3. Gib deinen API-Key ein und klicke **Key speichern**
4. Der Badge **Key gespeichert** erscheint

### Woher bekomme ich API-Keys?

| Provider    | URL                                         |
| ----------- | ------------------------------------------- |
| OpenAI      | https://platform.openai.com/api-keys        |
| Anthropic   | https://console.anthropic.com/              |
| Google      | https://aistudio.google.com/apikey          |
| DeepSeek    | https://platform.deepseek.com/              |
| OpenRouter  | https://openrouter.ai/keys                  |
| HuggingFace | https://huggingface.co/settings/tokens      |
| ElevenLabs  | https://elevenlabs.io/app/settings/api-keys |

## Provider aktivieren

1. Sobald ein Key gespeichert ist, wird der Provider aktivierbar
2. Klicke auf den Provider-Namen, um ihn zu aktivieren
3. Das Modell wird automatisch auf den Default gesetzt
4. Du kannst das Modell im Dropdown ändern

## Ollama — Lokal oder Cloud

Ollama hat zwei Modi:

- **Lokal**: Verbindung zu einem lokalen Ollama-Server (`http://localhost:11434`). Kein API-Key nötig.
- **Cloud**: Verbindung zu Ollama Cloud (`https://ollama.com`). API-Key erforderlich.

Mit dem Schalter **Lokal / Cloud** im Ollama-Bereich kannst du umschalten.

### Ollama Local einrichten

1. Installiere Ollama: https://ollama.com/download
2. Starte Ollama (`ollama serve`)
3. Lade ein Modell: `ollama pull llama3.2`
4. Wähle **Ollama** → **Lokal** in den Einstellungen

### Ollama Cloud einrichten

1. Erstelle einen Account auf https://ollama.com
2. Generiere einen API-Key
3. Wähle **Ollama** → **Cloud** und speichere den Key

## Feature-Bereiche

Jeder Bereich hat eigene Provider/Model-Einstellungen:

| Bereich         | Beschreibung                |
| --------------- | --------------------------- |
| Assistant Chat  | Chatbot und Konversationen  |
| Embeddings      | Vektor-Einbettungen für RAG |
| Creative Gym    | Kreative Schreib-Starter    |
| Bildgenerierung | Cover-Bilder generieren     |
| Speech-to-Text  | Audio transkribieren        |
| Text-to-Speech  | Text vorlesen lassen        |
| Video           | Video generieren            |

## Key validieren

Klicke **Verbindung prüfen** neben einem gespeicherten Key, um zu prüfen ob der Key gültig ist und welche Modelle verfügbar sind.

## Key entfernen

Klicke **Entfernen** neben einem gespeicherten Key. Der Provider wird deaktiviert, wenn er der einzige Key-fähige Provider war.

## Fehlerbehebung

| Problem                        | Lösung                                                 |
| ------------------------------ | ------------------------------------------------------ |
| 401 Unauthorized               | JWT abgelaufen — Seite neu laden                       |
| "Kein API-Key"                 | Key für den gewählten Provider hinterlegen             |
| Ollama Local nicht erreichbar  | Ollama-Server laufen? Port 11434 offen?                |
| Key-Validierung fehlgeschlagen | Key korrekt? Richtiger Provider gewählt?               |
| Modell-Liste leer              | Provider unterstützt kein Discovery — manuell eingeben |
