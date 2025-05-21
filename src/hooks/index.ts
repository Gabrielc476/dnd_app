// hooks/index.ts
export { useAuth } from "./useAuth";
export { useCharacter } from "./useCharacter";
export { useCampaign } from "./useCampaign";
export { useCombat } from "./useCombat";
export { useCompendium } from "./useCompendium";
export { useNPC } from "./useNPC";
export { useLocks } from "./useLocks";
export { useImage } from "./useImage";
export { useWebSocketEvents } from "./useWebsocketEvents";

// Re-export types
export type { UseAuthReturn } from "./useAuth";
export type { UseCharacterProps, UseCharacterReturn } from "./useCharacter";
export type { UseCampaignProps, UseCampaignReturn } from "./useCampaign";
export type { UseCombatProps, UseCombatReturn } from "./useCombat";
export type { UseCompendiumReturn } from "./useCompendium";
export type { UseNPCProps, UseNPCReturn } from "./useNPC";
export type { UseLocksProps, UseLocksReturn } from "./useLocks";
export type { UseImageProps, UseImageReturn } from "./useImage";
export type {
  UseWebSocketEventsProps,
  UseWebSocketEventsReturn,
  EventHandler,
} from "./useWebsocketEvents";
