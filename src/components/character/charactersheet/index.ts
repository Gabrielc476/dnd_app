// src/components/character/index.ts

// Main character sheet component
export { CharacterSheet } from "./CharacterSheet";

// Individual character components
export { CharacterHeader } from "./CharacterHeader";
export { CharacterAttributes } from "./CharacterAttributes";
export { CharacterDefenses } from "./CharacterDefenses";
export { CharacterSkills } from "./CharacterSkills";
export { CharacterFeatures } from "./CharacterFeatures";
export { CharacterInventory } from "./CharacterInventory";
export { CharacterConditions } from "./CharacterConditions";
export { CharacterActions } from "./CharacterActions";

// Types and interfaces
export type {
  CharacterComponentProps,
  CharacterActionProps,
  SkillInfo,
  AttributeInfo,
} from "./types";
