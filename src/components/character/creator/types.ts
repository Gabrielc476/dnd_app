// src/components/character/creator/types.ts

import {
  Character,
  Attributes,
  InventoryItem,
  Proficiency,
  Feature,
} from "@/lib/types";

export interface Race {
  id: string;
  name: string;
  description: string;
  abilityScoreIncrease: Partial<Attributes>;
  size: "Small" | "Medium" | "Large";
  speed: number;
  languages: string[];
  proficiencies: string[];
  traits: RaceTrait[];
  subraces?: Subrace[];
}

export interface Subrace {
  id: string;
  name: string;
  description: string;
  abilityScoreIncrease: Partial<Attributes>;
  traits: RaceTrait[];
}

export interface RaceTrait {
  name: string;
  description: string;
}

export interface CharacterClass {
  id: string;
  name: string;
  description: string;
  hitDie: number;
  primaryAbility: (keyof Attributes)[];
  savingThrowProficiencies: (keyof Attributes)[];
  skillProficiencies: {
    choose: number;
    from: string[];
  };
  equipment: ClassEquipment[];
  spellcasting?: SpellcastingInfo;
  features: ClassFeature[];
  proficiencies: {
    armor: string[];
    weapons: string[];
    tools: string[];
  };
}

export interface ClassFeature {
  name: string;
  level: number;
  description: string;
}

export interface ClassEquipment {
  category: string;
  options: EquipmentOption[];
}

export interface EquipmentOption {
  name: string;
  items: string[];
  quantity?: number;
}

export interface SpellcastingInfo {
  ability: keyof Attributes;
  ritual: boolean;
  spellcastingFocus: string;
  cantripsKnown: number[];
  spellsKnown?: number[];
  spellSlots: Record<string, number>[];
}

export interface Background {
  id: string;
  name: string;
  description: string;
  skillProficiencies: string[];
  languages?: string[];
  equipment: InventoryItem[];
  feature: {
    name: string;
    description: string;
  };
  suggestedCharacteristics: {
    personality: string[];
    ideals: string[];
    bonds: string[];
    flaws: string[];
  };
}

export interface CharacterCreationData {
  // Basic Info
  name: string;
  race: Race | null;
  subrace: Subrace | null;
  characterClass: CharacterClass | null;
  background: Background | null;
  alignment: string;

  // Attributes
  attributes: Attributes;
  attributeMethod: "pointBuy" | "standardArray" | "rolled";
  pointBuyRemaining?: number;

  // HP and derived stats
  hitPoints: number;
  armorClass: number;
  speed: number;
  initiativeBonus: number;

  // Proficiencies
  proficiencies: Proficiency[];
  languages: string[];

  // Equipment
  startingEquipment: InventoryItem[];
  selectedEquipmentPackage?: string;

  // Features and Traits
  features: Feature[];

  // Spellcasting (if applicable)
  spellcasting?: {
    ability: keyof Attributes;
    cantrips: string[];
    spells: string[];
  };

  // Character Details
  personalityTraits?: string[];
  ideals?: string[];
  bonds?: string[];
  flaws?: string[];

  // Validation
  isValid: boolean;
  validationErrors: string[];
}

export interface CreationStep {
  id: string;
  title: string;
  description: string;
  isComplete: boolean;
  isRequired: boolean;
}

export interface CharacterCreatorProps {
  campaignId: string;
  userId: string;
  onCharacterCreated: (character: Character) => void;
  onCancel: () => void;
}

export interface StepComponentProps {
  data: CharacterCreationData;
  onUpdate: (updates: Partial<CharacterCreationData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export interface AttributeGenerationMethod {
  id: "pointBuy" | "standardArray" | "rolled";
  name: string;
  description: string;
}

export const ATTRIBUTE_GENERATION_METHODS: AttributeGenerationMethod[] = [
  {
    id: "pointBuy",
    name: "Point Buy",
    description:
      "Customize your character's abilities using a point-buy system (27 points).",
  },
  {
    id: "standardArray",
    name: "Standard Array",
    description:
      "Use the standard set of ability scores (15, 14, 13, 12, 10, 8).",
  },
  {
    id: "rolled",
    name: "Roll for Stats",
    description:
      "Roll 4d6, drop lowest, six times to determine ability scores.",
  },
];

export const STANDARD_ARRAY: Attributes = {
  strength: 15,
  dexterity: 14,
  constitution: 13,
  intelligence: 12,
  wisdom: 10,
  charisma: 8,
};

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
];

// Utility functions
export const calculateModifier = (score: number): number => {
  return Math.floor((score - 10) / 2);
};

export const getPointBuyCost = (score: number): number => {
  if (score <= 8) return 0;
  if (score <= 13) return score - 8;
  if (score === 14) return 7;
  if (score === 15) return 9;
  return 0; // Invalid score
};

export const isValidPointBuyScore = (score: number): boolean => {
  return score >= 8 && score <= 15;
};

export const validateCharacterData = (
  data: CharacterCreationData
): string[] => {
  const errors: string[] = [];

  if (!data.name.trim()) {
    errors.push("Character name is required");
  }

  if (!data.race) {
    errors.push("Race selection is required");
  }

  if (!data.characterClass) {
    errors.push("Class selection is required");
  }

  if (!data.background) {
    errors.push("Background selection is required");
  }

  if (!data.alignment) {
    errors.push("Alignment selection is required");
  }

  // Validate attributes
  const attrs = Object.values(data.attributes);
  if (attrs.some((score) => score < 8 || score > 20)) {
    errors.push("All ability scores must be between 8 and 20");
  }

  // Validate point buy if using that method
  if (data.attributeMethod === "pointBuy" && data.pointBuyRemaining !== 0) {
    errors.push("All point buy points must be spent or refunded");
  }

  return errors;
};
