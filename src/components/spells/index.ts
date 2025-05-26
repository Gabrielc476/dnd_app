// ========================================
// components/spells/index.ts
// ========================================

// Main SpellBook component
export { SpellBook } from "./SpellBook";

// Individual spell card components
export { PreparedSpellCard } from "./PreparedSpellCard";
export { SearchSpellCard } from "./SearchSpellCard";
export { SpellSlotCard } from "./SpellSlotCard";

// List components
export { PreparedSpellsList } from "./PreparedSpellsList";
export { SpellSlotsList } from "./SpellSlotsList";
export { SpellSearchResults } from "./SpellSearchResults";

// Form/Filter components
export { SpellSearchFilters } from "./SpellSearchFilters";

// Dialog components
export { CastSpellDialog } from "./CastSpellDialog";

// Types and utilities - export everything from types
export * from "./types";

// Additional type aliases for convenience
export type {
  SpellSlot,
  SpellFilters,
  SpellCardBaseProps,
  SpellActionHandlers,
} from "./types";
