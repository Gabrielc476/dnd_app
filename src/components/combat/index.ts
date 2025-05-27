// src/components/combat/index.ts

// Main Combat Tracker component
export { CombatTracker } from "./CombatTracker";

// Core combat components
export { InitiativeList } from "./InitiativeList";
export { CombatControls } from "./CombatControls";
export { CombatActions } from "./CombatActions";
export { CombatStats } from "./CombatStats";

// Individual combatant components
export { CombatantCard } from "./CombatantCard";

// Condition management
export { ConditionManager } from "./ConditionManager";

// Utility components
export { DiceRoller } from "./DiceRoller";

// Types and interfaces (if you create them in the future)
// export type { CombatTrackerProps, CombatantAction } from "./types";

// Re-export commonly used types for convenience
export type {
  Combat,
  InitiativeEntry,
  ConditionEffect,
  CombatEvent,
} from "@/lib/types";

// Optional: Export hooks if you create combat-specific hooks
// export { useCombatTracker } from "./hooks/useCombatTracker";
// export { useCombatTimer } from "./hooks/useCombatTimer";
