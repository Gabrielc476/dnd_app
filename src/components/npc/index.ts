// src/components/npc/index.ts

// ========================================
// NPC MANAGER - COMPLETE EXPORT INDEX
// ========================================

// Main NPC Manager component
export { NPCManager } from "./manager/NPCManager";

// List and visualization components
export { NPCList } from "./list/NPCList";
export { NPCCard } from "./list/NPCCard";
export { NPCPreview } from "./list/NPCPreview";

// Form and editing components
export { NPCForm } from "./forms/NPCForm";
export { NPCStatsEditor } from "./forms/NPCStatsEditor";
export { NPCActionsEditor } from "./forms/NPCActionsEditor";

// Import and template components
export { NPCImporter } from "./import/NPCImporter";
export { NPCTemplateManager } from "./import/NPCTemplateManager";

// Search and filtering components
export { NPCSearch } from "./search/NPCSearch";
export { NPCFilters } from "./search/NPCFilters";

// Bulk operations components
export { NPCBulkActions } from "./bulk/NPCBulkActions";
export { NPCExporter } from "./bulk/NPCExporter";

// Combat-specific components
export { NPCCombatControls } from "./combat/NPCCombatControls";
export { NPCHealthTracker } from "./combat/NPCHealthTracker";

// Utility components
export { NPCStatBlock } from "./utils/NPCStatBlock";
export { NPCDiceRoller } from "./utils/NPCDiceRoller";

// Types and interfaces
export type {
  NPCManagerProps,
  NPCManagerState,
  NPCActionHandlers,
  NPCListProps,
  NPCCardProps,
  NPCPreviewProps,
  NPCFormProps,
  NPCStatsEditorProps,
  NPCActionsEditorProps,
  NPCImporterProps,
  NPCTemplateManagerProps,
  NPCSearchProps,
  NPCFiltersProps,
  NPCFilterState,
  SavedFilter,
  NPCBulkActionsProps,
  NPCExporterProps,
  NPCCombatControlsProps,
  NPCHealthTrackerProps,
  NPCStatBlockProps,
  NPCDiceRollerProps,
} from "./types";

// Re-export commonly used types from lib/types
export type { NPC, NPCListItem, NPCAction, NPCStats } from "@/lib/types";

// ========================================
// CONVENIENCE EXPORTS
// ========================================

// For quick access to main functionality
export {
  NPCManager as default,
  NPCManager as NPCSystem,
} from "./manager/NPCManager";
