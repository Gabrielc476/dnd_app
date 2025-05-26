// src/components/character/creator/index.ts

// Main Character Creator component
export { CharacterCreator } from "./CharacterCreator";

// Step components
export { BasicInfoStep } from "./steps/BasicInfoStep";
export { RaceSelectionStep } from "./steps/RaceSelectionStep";
export { ClassSelectionStep } from "./steps/ClassSelectionStep";
export { AttributeSelectionStep } from "./steps/AttributeSelectionStep";
export { BackgroundSelectionStep } from "./steps/BackgroundSelectionStep";
export { EquipmentSelectionStep } from "./steps/EquipmentSelectionStep";
export { SpellSelectionStep } from "./steps/SpellSelectionStep";
export { FinalReviewStep } from "./steps/FinalReviewStep";

// Types and utilities
export * from "./types";

// Re-export commonly used types
export type {
  CharacterCreatorProps,
  CharacterCreationData,
  StepComponentProps,
  Race,
  CharacterClass,
  Background,
  CreationStep,
} from "./types";
