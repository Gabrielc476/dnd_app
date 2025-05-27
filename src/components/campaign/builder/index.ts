// src/components/campaign/builder/index.ts

// Main Campaign Builder component
export { CampaignBuilder } from "./CampaignBuilder";

// Individual builder components
export { CampaignForm } from "./CampaignForm";
export { PlayerManager } from "./PlayerManager";
export { EncounterBuilder } from "./EncounterBuilder";
export { ImageManager } from "./ImageManager";
export { CampaignSettings } from "./CampaignSettings";
export { CampaignPreview } from "./CampaignPreview";

// Types and interfaces
export type {
  CampaignBuilderProps,
  CampaignBuilderData,
} from "./CampaignBuilder";

// Re-export commonly used types for convenience
export type { Encounter, Image, NPCReference, Trap } from "@/lib/types";
