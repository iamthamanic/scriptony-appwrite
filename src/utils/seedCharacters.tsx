/**
 * 🎭 CHARACTER SEED DATA
 *
 * Hilfsfunktion zum Erstellen von Test-Characters für ein Projekt.
 * Nützlich für Development & Testing der @-mention Funktion.
 */

import * as CharactersAPI from "../lib/api/characters-api";

export const EXAMPLE_CHARACTERS = [
  {
    name: "Max Weber",
    role: "protagonist" as const,
    description: "Ein mutiger Detektiv mit einem dunklen Geheimnis",
    age: 35,
  },
  {
    name: "Sarah Johnson",
    role: "protagonist" as const,
    description: "Brillante Wissenschaftlerin und Max' Partnerin",
    age: 32,
  },
  {
    name: "Viktor Steiner",
    role: "antagonist" as const,
    description: "Skrupelloser Geschäftsmann mit gefährlichen Verbindungen",
    age: 52,
  },
  {
    name: "Emma Klein",
    role: "supporting" as const,
    description: "IT-Expertin und Hackerin",
    age: 28,
  },
  {
    name: "Thomas Müller",
    role: "supporting" as const,
    description: "Polizeikommissar und alter Freund von Max",
    age: 45,
  },
  {
    name: "Lisa Schmidt",
    role: "minor" as const,
    description: "Journalistin",
    age: 29,
  },
];

/**
 * Erstellt Test-Characters für ein Projekt
 */
export async function seedCharacters(projectId: string, token: string) {
  console.log("🎭 Erstelle Test-Characters...");

  const created = [];

  for (const charData of EXAMPLE_CHARACTERS) {
    try {
      const character = await CharactersAPI.createCharacter(
        projectId,
        charData,
        token,
      );
      created.push(character);
      console.log(`✅ Created: ${character.name}`);
    } catch (error) {
      console.error(`❌ Failed to create ${charData.name}:`, error);
    }
  }

  console.log(
    `🎉 ${created.length}/${EXAMPLE_CHARACTERS.length} Characters erstellt!`,
  );
  return created;
}

/**
 * Löscht alle Characters eines Projekts
 */
export async function clearCharacters(projectId: string, token: string) {
  console.log("🗑️ Lösche alle Characters...");

  try {
    const characters = await CharactersAPI.getCharacters(projectId, token);

    for (const char of characters) {
      await CharactersAPI.deleteCharacter(char.id, token);
      console.log(`✅ Deleted: ${char.name}`);
    }

    console.log(`🎉 ${characters.length} Characters gelöscht!`);
  } catch (error) {
    console.error("❌ Error clearing characters:", error);
  }
}

/**
 * Hilfsfunktion für Console: Characters erstellen
 *
 * Usage in Browser Console:
 * ```
 * import { seedCharacters } from './utils/seedCharacters';
 * await seedCharacters('YOUR_PROJECT_ID', 'YOUR_TOKEN');
 * ```
 */
