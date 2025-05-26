// ========================================
// components/spells/types.ts
// ========================================

import { Spell } from "@/lib/types";

// Spell slot interface for component usage
export interface SpellSlot {
  level: number;
  used: number;
  total: number;
  available: number;
}

// Search filters interface
export interface SpellFilters {
  level?: string;
  school?: string;
  class?: string;
  name?: string;
}

// Base props for spell cards
export interface SpellCardBaseProps {
  spell: Spell;
  isReadOnly?: boolean;
}

// Action handlers interface
export interface SpellActionHandlers {
  onPrepareSpell: (spell: Spell) => void;
  onUnprepareSpell: (spell: Spell) => void;
  onCastSpell: (spell: Spell, level: number) => void;
}

// Constants for spell levels
export const SPELL_LEVELS = [
  { value: "0", label: "Cantrip" },
  { value: "1", label: "1st Level" },
  { value: "2", label: "2nd Level" },
  { value: "3", label: "3rd Level" },
  { value: "4", label: "4th Level" },
  { value: "5", label: "5th Level" },
  { value: "6", label: "6th Level" },
  { value: "7", label: "7th Level" },
  { value: "8", label: "8th Level" },
  { value: "9", label: "9th Level" },
] as const;

// Constants for spell schools
export const SPELL_SCHOOLS = [
  "Abjuration",
  "Conjuration",
  "Divination",
  "Enchantment",
  "Evocation",
  "Illusion",
  "Necromancy",
  "Transmutation",
] as const;

// Utility functions
export const getSpellLevelColor = (level: number): string => {
  if (level === 0) return "bg-gray-500";
  if (level <= 2) return "bg-green-500";
  if (level <= 4) return "bg-blue-500";
  if (level <= 6) return "bg-purple-500";
  if (level <= 8) return "bg-red-500";
  return "bg-yellow-500";
};

export const getSpellLevelLabel = (level: number): string => {
  return level === 0 ? "Cantrip" : `Level ${level}`;
};

export const getSchoolAbbreviation = (school: string): string => {
  return school.substring(0, 3).toUpperCase();
};

// Type guards
export const isCantrip = (spell: Spell): boolean => {
  return spell.level === 0;
};

export const requiresSpellSlot = (spell: Spell): boolean => {
  return spell.level > 0;
};

// Spell slot utilities
export const hasAvailableSlots = (
  spellSlots: SpellSlot[],
  minimumLevel: number
): boolean => {
  return spellSlots.some(
    (slot) => slot.level >= minimumLevel && slot.available > 0
  );
};

export const getHighestAvailableSlotLevel = (
  spellSlots: SpellSlot[]
): number => {
  const availableSlots = spellSlots.filter((slot) => slot.available > 0);
  if (availableSlots.length === 0) return 0;
  return Math.max(...availableSlots.map((slot) => slot.level));
};

export const getTotalSlotsUsed = (spellSlots: SpellSlot[]): number => {
  return spellSlots.reduce((total, slot) => total + slot.used, 0);
};

export const getTotalSlotsAvailable = (spellSlots: SpellSlot[]): number => {
  return spellSlots.reduce((total, slot) => total + slot.total, 0);
};
