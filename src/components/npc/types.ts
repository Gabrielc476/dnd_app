// src/components/npc/types.ts

import { NPC, NPCListItem, NPCAction, NPCStats } from "@/lib/types";
import { ReactNode } from "react";

// Main NPC Manager Props
export interface NPCManagerProps {
  campaignId: string;
  userId: string;
  isReadOnly?: boolean;
}

// NPC Filter and Search Types
export interface NPCFilters {
  search?: string;
  challengeRating?: string | string[];
  creatureType?: string | string[];
  source?: "all" | "custom" | "compendium";
  tags?: string[];
  status?: "all" | "alive" | "dead" | "unconscious";
  minCR?: number;
  maxCR?: number;
}

export interface NPCSearchOptions {
  query: string;
  filters: NPCFilters;
  sortBy: "name" | "cr" | "type" | "created" | "modified";
  sortOrder: "asc" | "desc";
  page: number;
  limit: number;
}

// NPC List and Card Types
export interface NPCListProps {
  npcs: NPCListItem[];
  selectedNPCs: string[];
  viewMode: "grid" | "list" | "table";
  onSelectNPC: (npcId: string) => void;
  onSelectMultiple: (npcIds: string[]) => void;
  onEditNPC: (npcId: string) => void;
  onDeleteNPC: (npcId: string) => void;
  onDuplicateNPC: (npcId: string) => void;
  isLoading?: boolean;
  isReadOnly?: boolean;
}

export interface NPCCardProps {
  npc: NPCListItem;
  isSelected?: boolean;
  viewMode: "grid" | "list";
  onSelect: (npcId: string) => void;
  onEdit: (npcId: string) => void;
  onDelete: (npcId: string) => void;
  onDuplicate: (npcId: string) => void;
  showActions?: boolean;
  isReadOnly?: boolean;
}

// NPC Form Types
export interface NPCFormProps {
  npc?: NPC;
  campaignId: string;
  userId: string;
  mode: "create" | "edit" | "duplicate";
  onSave: (npc: NPC) => void;
  onCancel: () => void;
  isReadOnly?: boolean;
}

export interface NPCFormData {
  name: string;
  source: "custom" | "compendium";
  compendium_id?: string;
  campaign_id: string;
  stats: NPCStats;
  actions: NPCAction[];
  legendary_actions: NPCAction[];
  reactions: NPCAction[];
  features: Array<{ name: string; description: string }>;
  description?: string;
  tags: string[];
  notes?: string;
  isValid: boolean;
  validationErrors: string[];
}

// NPC Stats Editor Types
export interface NPCStatsEditorProps {
  stats: NPCStats;
  onChange: (stats: NPCStats) => void;
  isReadOnly?: boolean;
  showCalculator?: boolean;
}

// NPC Actions Editor Types
export interface NPCActionsEditorProps {
  actions: NPCAction[];
  legendaryActions: NPCAction[];
  reactions: NPCAction[];
  onActionsChange: (actions: NPCAction[]) => void;
  onLegendaryActionsChange: (actions: NPCAction[]) => void;
  onReactionsChange: (actions: NPCAction[]) => void;
  isReadOnly?: boolean;
}

export interface ActionEditorProps {
  action: NPCAction;
  onChange: (action: NPCAction) => void;
  onDelete: () => void;
  isReadOnly?: boolean;
}

// NPC Import Types
export interface NPCImporterProps {
  campaignId: string;
  onImport: (npcs: NPC[]) => void;
  onCancel: () => void;
  maxImports?: number;
}

export interface ImportableMonster {
  id: string;
  name: string;
  type: string;
  challenge_rating: string;
  source: string;
  hit_points: number;
  armor_class: number;
  selected?: boolean;
  customName?: string;
}

// NPC Template Types
export interface NPCTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  template: Partial<NPCFormData>;
  isBuiltIn: boolean;
  createdBy?: string;
  tags: string[];
}

export interface NPCTemplateManagerProps {
  onApplyTemplate: (template: NPCTemplate) => void;
  onCancel: () => void;
  currentNPCType?: string;
}

// NPC Bulk Actions Types
export interface NPCBulkActionsProps {
  selectedNPCs: string[];
  npcs: NPCListItem[];
  onBulkEdit: (updates: Partial<NPC>) => void;
  onBulkDelete: (npcIds: string[]) => void;
  onBulkExport: (npcIds: string[], format: ExportFormat) => void;
  onBulkTag: (npcIds: string[], tags: string[]) => void;
  onClearSelection: () => void;
}

export type ExportFormat = "json" | "pdf" | "roll20" | "foundry" | "statblock";

// NPC Search Types
export interface NPCSearchProps {
  filters: NPCFilters;
  onFiltersChange: (filters: NPCFilters) => void;
  onSearch: (query: string) => void;
  onReset: () => void;
  suggestions?: string[];
  isLoading?: boolean;
}

// NPC Preview Types
export interface NPCPreviewProps {
  npc: NPC | null;
  isLoading?: boolean;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onExport?: (format: ExportFormat) => void;
  showActions?: boolean;
  isReadOnly?: boolean;
}

// NPC Combat Types
export interface NPCCombatControlsProps {
  npc: NPC;
  combatId?: string;
  isInCombat: boolean;
  currentHP: number;
  maxHP: number;
  conditions: string[];
  onHPChange: (change: number) => void;
  onAddCondition: (condition: string) => void;
  onRemoveCondition: (condition: string) => void;
  onRollInitiative: () => void;
  onUseAction: (action: NPCAction) => void;
  isReadOnly?: boolean;
}

export interface NPCHealthTrackerProps {
  npc: NPC;
  currentHP: number;
  maxHP: number;
  temporaryHP: number;
  conditions: string[];
  damageLog: DamageLogEntry[];
  onHPChange: (change: number, isTemp?: boolean) => void;
  onAddCondition: (condition: string) => void;
  onRemoveCondition: (condition: string) => void;
  onResetHP: () => void;
  isReadOnly?: boolean;
}

export interface DamageLogEntry {
  id: string;
  timestamp: string;
  type: "damage" | "healing" | "temp_hp";
  amount: number;
  source?: string;
  description?: string;
}

// NPC Utility Types
export interface NPCStatBlockProps {
  npc: NPC;
  variant: "full" | "compact" | "print";
  showActions?: boolean;
  showLegendaryActions?: boolean;
  showReactions?: boolean;
  className?: string;
}

export interface NPCDiceRollerProps {
  npc: NPC;
  onRoll: (result: DiceRollResult) => void;
  showQuickRolls?: boolean;
  isReadOnly?: boolean;
}

export interface DiceRollResult {
  type: "attack" | "damage" | "save" | "ability" | "skill";
  formula: string;
  result: number;
  breakdown: string;
  advantage?: boolean;
  disadvantage?: boolean;
  modifier?: number;
}

// Challenge Rating Types
export interface ChallengeRating {
  rating: string;
  xp: number;
  proficiencyBonus: number;
  armorClass: [number, number];
  hitPoints: [number, number];
  attackBonus: [number, number];
  damagePerRound: [number, number];
  saveDC: [number, number];
}

// NPC Manager State Types
export interface NPCManagerState {
  activeTab: "list" | "create" | "edit" | "import" | "templates";
  selectedNPCs: string[];
  currentNPC: NPC | null;
  editingNPC: string | null;
  searchFilters: NPCFilters;
  viewMode: "grid" | "list" | "table";
  showPreview: boolean;
  bulkMode: boolean;
}

// Event Handler Types
export interface NPCEventHandlers {
  onCreateNPC: () => void;
  onEditNPC: (npcId: string) => void;
  onDeleteNPC: (npcId: string) => void;
  onDuplicateNPC: (npcId: string) => void;
  onImportNPCs: () => void;
  onBulkActions: () => void;
  onSelectNPC: (npcId: string) => void;
  onSelectMultiple: (npcIds: string[]) => void;
  onFiltersChange: (filters: NPCFilters) => void;
  onViewModeChange: (mode: "grid" | "list" | "table") => void;
}

// Common Props
export interface WithCampaignProps {
  campaignId: string;
  userId: string;
}

export interface WithLoadingProps {
  isLoading?: boolean;
}

export interface WithErrorProps {
  error?: string | null;
}

export interface WithReadOnlyProps {
  isReadOnly?: boolean;
}

// Validation Types
export interface NPCValidationRule {
  field: keyof NPCFormData;
  validate: (value: any, data: NPCFormData) => string | null;
}

export interface NPCValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

// Utility Functions Types
export type NPCCalculator = {
  calculateCR: (stats: NPCStats, actions: NPCAction[]) => string;
  calculateProficiencyBonus: (cr: string) => number;
  calculateModifier: (score: number) => number;
  calculateHitPoints: (
    hitDie: number,
    constitution: number,
    level: number
  ) => number;
  calculateArmorClass: (
    baseAC: number,
    dexModifier: number,
    armorBonus: number
  ) => number;
};

// Constants
export const CREATURE_TYPES = [
  "Aberration",
  "Beast",
  "Celestial",
  "Construct",
  "Dragon",
  "Elemental",
  "Fey",
  "Fiend",
  "Giant",
  "Humanoid",
  "Monstrosity",
  "Ooze",
  "Plant",
  "Undead",
] as const;

export const CREATURE_SIZES = [
  "Tiny",
  "Small",
  "Medium",
  "Large",
  "Huge",
  "Gargantuan",
] as const;

export const CHALLENGE_RATINGS = [
  "0",
  "1/8",
  "1/4",
  "1/2",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
  "29",
  "30",
] as const;

export const DAMAGE_TYPES = [
  "Acid",
  "Bludgeoning",
  "Cold",
  "Fire",
  "Force",
  "Lightning",
  "Necrotic",
  "Piercing",
  "Poison",
  "Psychic",
  "Radiant",
  "Slashing",
  "Thunder",
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
  "Exhaustion",
] as const;

export type CreatureType = (typeof CREATURE_TYPES)[number];
export type CreatureSize = (typeof CREATURE_SIZES)[number];
export type ChallengeRatingValue = (typeof CHALLENGE_RATINGS)[number];
export type DamageType = (typeof DAMAGE_TYPES)[number];
export type Condition = (typeof CONDITIONS)[number];
