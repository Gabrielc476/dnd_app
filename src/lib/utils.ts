import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date to a readable string
 */
export function formatDate(date: Date | string): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format ability score modifier
 */
export function formatModifier(score: number): string {
  const modifier = Math.floor((score - 10) / 2);
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

/**
 * Calculate proficiency bonus based on level
 */
export function getProficiencyBonus(level: number): number {
  return Math.floor((level - 1) / 4) + 2;
}

/**
 * Format dice roll result
 */
export function formatDiceRoll(
  result: number,
  formula: string,
  modifier: number = 0
): string {
  let modifierStr = "";
  if (modifier > 0) {
    modifierStr = ` + ${modifier}`;
  } else if (modifier < 0) {
    modifierStr = ` - ${Math.abs(modifier)}`;
  }

  return `${result} (${formula}${modifierStr})`;
}

/**
 * Debounce function to limit how often a function can be called
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Parse a challenge rating string to a number
 * Handles fractions like "1/4", "1/2" etc.
 */
export function parseCR(cr: string): number {
  if (cr.includes("/")) {
    const [numerator, denominator] = cr.split("/").map(Number);
    return numerator / denominator;
  }
  return parseFloat(cr);
}

/**
 * Get class for HP percentage
 */
export function getHPColorClass(current: number, max: number): string {
  const ratio = current / max;
  if (ratio <= 0.25) return "text-red-600";
  if (ratio <= 0.5) return "text-orange-500";
  if (ratio <= 0.75) return "text-yellow-500";
  return "text-green-600";
}
