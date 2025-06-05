// src/app/characters/index.ts

// ========================================
// CHARACTER PAGES - EXPORT INDEX
// ========================================

// Main characters list page
export { default as CharactersPage } from "./page";

// Character management pages
export { default as CreateCharacterPage } from "./create/page";
export { default as ImportCharactersPage } from "./import/page";

// Individual character pages
export { default as CharacterDetailPage } from "./[id]/page";
export { default as EditCharacterPage } from "./[id]/edit/page";

// Re-export components for convenience
export { CharacterSheet } from "@/components/character/charactersheet";
export { CharacterCreator } from "@/components/character/creator";
export { SpellBook } from "@/components/spells";

// Re-export types
export type {
  Character,
  CharacterListItem,
  Attributes,
  HitPoints,
  Spellcasting,
  InventoryItem,
  Proficiency,
  Feature,
} from "@/lib/types";

// Re-export hooks
export { useCharacter } from "@/hooks/useCharacter";

// ========================================
// ROUTE CONSTANTS
// ========================================

export const CHARACTER_ROUTES = {
  LIST: "/characters",
  CREATE: "/characters/create",
  IMPORT: "/characters/import",
  DETAIL: (id: string) => `/characters/${id}`,
  EDIT: (id: string) => `/characters/${id}/edit`,
  DUPLICATE: (id: string) => `/characters/${id}/duplicate`,
} as const;

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Calculate ability modifier from ability score
 */
export const calculateModifier = (score: number): number => {
  return Math.floor((score - 10) / 2);
};

/**
 * Calculate proficiency bonus based on character level
 */
export const calculateProficiencyBonus = (level: number): number => {
  return Math.ceil(level / 4) + 1;
};

/**
 * Get HP color class based on current/max HP ratio
 */
export const getHPColorClass = (current: number, max: number): string => {
  const ratio = current / max;
  if (ratio <= 0.25) return "text-red-600";
  if (ratio <= 0.5) return "text-orange-500";
  if (ratio <= 0.75) return "text-yellow-500";
  return "text-green-600";
};

/**
 * Format modifier with proper sign
 */
export const formatModifier = (modifier: number): string => {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
};

/**
 * Validate character data for import
 */
export const validateCharacterData = (
  data: any
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== "string") {
    errors.push("Character name is required");
  }

  if (!data.race || typeof data.race !== "string") {
    errors.push("Character race is required");
  }

  if (!data.class || typeof data.class !== "string") {
    errors.push("Character class is required");
  }

  if (
    !data.level ||
    typeof data.level !== "number" ||
    data.level < 1 ||
    data.level > 20
  ) {
    errors.push("Character level must be a number between 1 and 20");
  }

  if (!data.attributes || typeof data.attributes !== "object") {
    errors.push("Character attributes are required");
  } else {
    const requiredAttributes = [
      "strength",
      "dexterity",
      "constitution",
      "intelligence",
      "wisdom",
      "charisma",
    ];
    for (const attr of requiredAttributes) {
      if (!data.attributes[attr] || typeof data.attributes[attr] !== "number") {
        errors.push(`Attribute ${attr} is required and must be a number`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Generate character export data
 */
export const generateCharacterExportData = (character: Character) => {
  // Remove sensitive/internal fields
  const exportData = { ...character };
  delete exportData._id;
  delete exportData.owner_id;
  delete exportData.campaign_id;
  delete exportData.created_at;
  delete exportData.updated_at;

  // Reset dynamic fields
  exportData.hp.current = exportData.hp.max;
  exportData.temporary_hp = 0;
  exportData.conditions = [];
  exportData.inspiration = false;

  return exportData;
};

/**
 * Get character summary for display
 */
export const getCharacterSummary = (
  character: Character | CharacterListItem
) => {
  return {
    name: character.name,
    level: character.level,
    race: character.race,
    class: character.class,
    hp: character.hp,
    description: `Level ${character.level} ${character.race} ${character.class}`,
  };
};

// ========================================
// CONSTANTS
// ========================================

export const ABILITY_SCORES = [
  { key: "strength", label: "Strength", short: "STR" },
  { key: "dexterity", label: "Dexterity", short: "DEX" },
  { key: "constitution", label: "Constitution", short: "CON" },
  { key: "intelligence", label: "Intelligence", short: "INT" },
  { key: "wisdom", label: "Wisdom", short: "WIS" },
  { key: "charisma", label: "Charisma", short: "CHA" },
] as const;

export const CHARACTER_CLASSES = [
  "Artificer",
  "Barbarian",
  "Bard",
  "Cleric",
  "Druid",
  "Fighter",
  "Monk",
  "Paladin",
  "Ranger",
  "Rogue",
  "Sorcerer",
  "Warlock",
  "Wizard",
] as const;

export const CHARACTER_RACES = [
  "Dragonborn",
  "Dwarf",
  "Elf",
  "Gnome",
  "Half-Elf",
  "Half-Orc",
  "Halfling",
  "Human",
  "Tiefling",
] as const;

export const ALIGNMENTS = [
  "Lawful Good",
  "Neutral Good",
  "Chaotic Good",
  "Lawful Neutral",
  "True Neutral",
  "Chaotic Neutral",
  "Lawful Evil",
  "Neutral Evil",
  "Chaotic Evil",
] as const;

export const CONDITIONS = [
  "Blinded",
  "Charmed",
  "Deafened",
  "Frightened",
  "Grappled",
  "Incapacitated",
  "Invisible",
  "Paralyzed",
  "Petrified",
  "Poisoned",
  "Prone",
  "Restrained",
  "Stunned",
  "Unconscious",
] as const;
