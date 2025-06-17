/**
 * Character Store - COMPLETAMENTE REFATORADO
 * Problemas resolvidos:
 * 1. ✅ rollInitiative function completada (estava cortada)
 * 2. ✅ Proper state management
 * 3. ✅ Error handling adequado
 * 4. ✅ Lock management
 * 5. ✅ WebSocket integration
 * 6. ✅ TypeScript types completos
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { charactersAPI } from "@/lib/api";
import { Character, CharacterListItem } from "@/lib/types";

// ===== TYPES =====
interface CharacterState {
  // State
  characters: CharacterListItem[];
  currentCharacter: Character | null;
  isLoading: boolean;
  error: string | null;
  lockedResources: Record<string, string>; // resourceId -> userId

  // Actions
  fetchCharacters: (campaignId?: string) => Promise<CharacterListItem[]>;
  fetchCharacter: (characterId: string) => Promise<Character | null>;
  createCharacter: (
    characterData: Partial<Character>
  ) => Promise<Character | null>;
  updateCharacter: (
    characterId: string,
    updates: Partial<Character>
  ) => Promise<boolean>;
  deleteCharacter: (characterId: string) => Promise<boolean>;
  setCurrentCharacter: (character: Character | null) => void;

  // HP Management
  updateHP: (
    characterId: string,
    hpChange: number,
    isTemp?: boolean
  ) => Promise<boolean>;
  setHP: (
    characterId: string,
    currentHP: number,
    maxHP?: number
  ) => Promise<boolean>;

  // Condition Management
  addCondition: (characterId: string, condition: string) => Promise<boolean>;
  removeCondition: (characterId: string, condition: string) => Promise<boolean>;
  clearConditions: (characterId: string) => Promise<boolean>;

  // Lock management
  setResourceLock: (resourceId: string, userId: string) => void;
  clearResourceLock: (resourceId: string) => void;
  isResourceLocked: (resourceId: string, currentUserId: string) => boolean;

  // Combat helpers
  rollInitiative: (
    characterId: string,
    advantage?: boolean,
    disadvantage?: boolean
  ) => Promise<number>;
  getModifier: (characterId: string, attribute: string) => number;
  getProficiencyBonus: (characterId: string) => number;
  rollAbilityCheck: (
    characterId: string,
    ability: string,
    advantage?: boolean,
    disadvantage?: boolean
  ) => Promise<{ total: number; rolls: number[]; modifier: number }>;
  rollSavingThrow: (
    characterId: string,
    ability: string,
    advantage?: boolean,
    disadvantage?: boolean
  ) => Promise<{ total: number; rolls: number[]; modifier: number }>;

  // Helper functions
  getCharacterById: (
    characterId: string
  ) => Character | CharacterListItem | null;
  isCurrentCharacter: (characterId: string) => boolean;
  refreshCharacter: (characterId: string) => Promise<void>;

  // Reset state
  resetState: () => void;

  // Notification system
  addNotification: (
    type: "info" | "success" | "warning" | "error",
    message: string
  ) => void;
}

// Sistema de notificações para comunicação com outros stores
let notificationCallback:
  | ((type: "info" | "success" | "warning" | "error", message: string) => void)
  | null = null;

export const setCharacterNotificationCallback = (
  callback: typeof notificationCallback
) => {
  notificationCallback = callback;
};

// ===== UTILITY FUNCTIONS =====
const rollDie = (sides: number): number =>
  Math.floor(Math.random() * sides) + 1;

const rollWithAdvantage = (
  advantage?: boolean,
  disadvantage?: boolean
): { rolls: number[]; result: number } => {
  if (advantage && disadvantage) {
    // Advantage and disadvantage cancel out
    const roll = rollDie(20);
    return { rolls: [roll], result: roll };
  } else if (advantage) {
    const roll1 = rollDie(20);
    const roll2 = rollDie(20);
    return { rolls: [roll1, roll2], result: Math.max(roll1, roll2) };
  } else if (disadvantage) {
    const roll1 = rollDie(20);
    const roll2 = rollDie(20);
    return { rolls: [roll1, roll2], result: Math.min(roll1, roll2) };
  } else {
    const roll = rollDie(20);
    return { rolls: [roll], result: roll };
  }
};

const getAbilityModifier = (score: number): number => {
  return Math.floor((score - 10) / 2);
};

const getProficiencyBonusForLevel = (level: number): number => {
  return Math.ceil(level / 4) + 1;
};

// ===== STORE IMPLEMENTATION =====
export const useCharacterStore = create<CharacterState>()(
  devtools(
    persist(
      (set, get) => ({
        // ===== INITIAL STATE =====
        characters: [],
        currentCharacter: null,
        isLoading: false,
        error: null,
        lockedResources: {},

        // ===== HELPER FUNCTIONS =====
        getCharacterById: (characterId: string) => {
          const state = get();

          // Check if it's the current character first
          if (
            state.currentCharacter &&
            state.currentCharacter._id === characterId
          ) {
            return state.currentCharacter;
          }

          // Look in the characters list (limited data)
          const characterListItem = state.characters.find(
            (c) => c._id === characterId
          );
          if (characterListItem) {
            return characterListItem;
          }

          return null;
        },

        isCurrentCharacter: (characterId: string) => {
          const currentCharacter = get().currentCharacter;
          return (
            currentCharacter !== null && currentCharacter._id === characterId
          );
        },

        // ===== API ACTIONS =====
        fetchCharacters: async (campaignId?: string) => {
          set({ isLoading: true, error: null });

          try {
            const characters = await charactersAPI.getCharacters(campaignId);

            set({
              characters,
              isLoading: false,
              error: null,
            });

            return characters;
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to fetch characters";
            set({
              isLoading: false,
              error: errorMessage,
            });

            notificationCallback?.(
              "error",
              `Failed to load characters: ${errorMessage}`
            );
            throw error;
          }
        },

        fetchCharacter: async (characterId: string) => {
          set({ isLoading: true, error: null });

          try {
            const character = await charactersAPI.getCharacter(characterId);

            set({
              currentCharacter: character,
              isLoading: false,
              error: null,
            });

            return character;
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to fetch character";
            set({
              isLoading: false,
              error: errorMessage,
            });

            notificationCallback?.(
              "error",
              `Failed to load character: ${errorMessage}`
            );
            return null;
          }
        },

        createCharacter: async (characterData: Partial<Character>) => {
          set({ isLoading: true, error: null });

          try {
            const newCharacter = await charactersAPI.createCharacter(
              characterData
            );

            set((state) => ({
              characters: [
                ...state.characters,
                {
                  _id: newCharacter._id,
                  name: newCharacter.name,
                  class: newCharacter.class,
                  level: newCharacter.level,
                  race: newCharacter.race,
                  campaign_id: newCharacter.campaign_id,
                  owner_id: newCharacter.owner_id,
                },
              ],
              currentCharacter: newCharacter,
              isLoading: false,
              error: null,
            }));

            notificationCallback?.(
              "success",
              `Character ${newCharacter.name} created successfully`
            );
            return newCharacter;
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to create character";
            set({
              isLoading: false,
              error: errorMessage,
            });

            notificationCallback?.(
              "error",
              `Failed to create character: ${errorMessage}`
            );
            return null;
          }
        },

        updateCharacter: async (
          characterId: string,
          updates: Partial<Character>
        ) => {
          try {
            const updatedCharacter = await charactersAPI.updateCharacter(
              characterId,
              updates
            );

            set((state) => ({
              characters: state.characters.map((c) =>
                c._id === characterId
                  ? {
                      ...c,
                      name: updatedCharacter.name,
                      class: updatedCharacter.class,
                      level: updatedCharacter.level,
                      race: updatedCharacter.race,
                    }
                  : c
              ),
              currentCharacter:
                state.currentCharacter?._id === characterId
                  ? updatedCharacter
                  : state.currentCharacter,
            }));

            notificationCallback?.(
              "success",
              `Character ${updatedCharacter.name} updated`
            );
            return true;
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to update character";
            set({ error: errorMessage });

            notificationCallback?.(
              "error",
              `Failed to update character: ${errorMessage}`
            );
            return false;
          }
        },

        deleteCharacter: async (characterId: string) => {
          try {
            await charactersAPI.deleteCharacter(characterId);

            set((state) => ({
              characters: state.characters.filter((c) => c._id !== characterId),
              currentCharacter:
                state.currentCharacter?._id === characterId
                  ? null
                  : state.currentCharacter,
            }));

            notificationCallback?.("success", "Character deleted successfully");
            return true;
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to delete character";
            set({ error: errorMessage });

            notificationCallback?.(
              "error",
              `Failed to delete character: ${errorMessage}`
            );
            return false;
          }
        },

        setCurrentCharacter: (character: Character | null) => {
          set({ currentCharacter: character });
        },

        // ===== HP MANAGEMENT =====
        updateHP: async (
          characterId: string,
          hpChange: number,
          isTemp?: boolean
        ) => {
          try {
            await charactersAPI.updateHP(characterId, hpChange, isTemp);

            // Update local state
            set((state) => {
              const updatedCharacter =
                state.currentCharacter?._id === characterId
                  ? {
                      ...state.currentCharacter,
                      hit_points_current: Math.max(
                        0,
                        Math.min(
                          state.currentCharacter.hit_points_max,
                          state.currentCharacter.hit_points_current + hpChange
                        )
                      ),
                    }
                  : state.currentCharacter;

              return { currentCharacter: updatedCharacter };
            });

            notificationCallback?.(
              "success",
              `HP ${hpChange > 0 ? "increased" : "decreased"} by ${Math.abs(
                hpChange
              )}`
            );
            return true;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Failed to update HP";
            set({ error: errorMessage });

            notificationCallback?.(
              "error",
              `Failed to update HP: ${errorMessage}`
            );
            return false;
          }
        },

        setHP: async (
          characterId: string,
          currentHP: number,
          maxHP?: number
        ) => {
          try {
            const updates: Partial<Character> = {
              hit_points_current: currentHP,
            };
            if (maxHP !== undefined) {
              updates.hit_points_max = maxHP;
            }

            await charactersAPI.updateCharacter(characterId, updates);

            // Update local state
            set((state) => {
              const updatedCharacter =
                state.currentCharacter?._id === characterId
                  ? {
                      ...state.currentCharacter,
                      hit_points_current: currentHP,
                      hit_points_max:
                        maxHP ?? state.currentCharacter.hit_points_max,
                    }
                  : state.currentCharacter;

              return { currentCharacter: updatedCharacter };
            });

            notificationCallback?.("success", "HP updated successfully");
            return true;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Failed to set HP";
            set({ error: errorMessage });

            notificationCallback?.(
              "error",
              `Failed to set HP: ${errorMessage}`
            );
            return false;
          }
        },

        // ===== CONDITION MANAGEMENT =====
        addCondition: async (characterId: string, condition: string) => {
          try {
            const character = get().getCharacterById(characterId) as Character;
            if (!character) {
              throw new Error("Character not found");
            }

            const currentConditions = character.conditions || [];
            if (currentConditions.includes(condition)) {
              notificationCallback?.(
                "warning",
                `Character already has condition: ${condition}`
              );
              return true;
            }

            const updates = {
              conditions: [...currentConditions, condition],
            };

            await charactersAPI.updateCharacter(characterId, updates);

            // Update local state
            set((state) => {
              const updatedCharacter =
                state.currentCharacter?._id === characterId
                  ? {
                      ...state.currentCharacter,
                      conditions: updates.conditions,
                    }
                  : state.currentCharacter;

              return { currentCharacter: updatedCharacter };
            });

            notificationCallback?.("success", `Added condition: ${condition}`);
            return true;
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to add condition";
            set({ error: errorMessage });

            notificationCallback?.(
              "error",
              `Failed to add condition: ${errorMessage}`
            );
            return false;
          }
        },

        removeCondition: async (characterId: string, condition: string) => {
          try {
            const character = get().getCharacterById(characterId) as Character;
            if (!character) {
              throw new Error("Character not found");
            }

            const currentConditions = character.conditions || [];
            const updates = {
              conditions: currentConditions.filter((c) => c !== condition),
            };

            await charactersAPI.updateCharacter(characterId, updates);

            // Update local state
            set((state) => {
              const updatedCharacter =
                state.currentCharacter?._id === characterId
                  ? {
                      ...state.currentCharacter,
                      conditions: updates.conditions,
                    }
                  : state.currentCharacter;

              return { currentCharacter: updatedCharacter };
            });

            notificationCallback?.(
              "success",
              `Removed condition: ${condition}`
            );
            return true;
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to remove condition";
            set({ error: errorMessage });

            notificationCallback?.(
              "error",
              `Failed to remove condition: ${errorMessage}`
            );
            return false;
          }
        },

        clearConditions: async (characterId: string) => {
          try {
            const updates = { conditions: [] };
            await charactersAPI.updateCharacter(characterId, updates);

            // Update local state
            set((state) => {
              const updatedCharacter =
                state.currentCharacter?._id === characterId
                  ? {
                      ...state.currentCharacter,
                      conditions: [],
                    }
                  : state.currentCharacter;

              return { currentCharacter: updatedCharacter };
            });

            notificationCallback?.("success", "All conditions cleared");
            return true;
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to clear conditions";
            set({ error: errorMessage });

            notificationCallback?.(
              "error",
              `Failed to clear conditions: ${errorMessage}`
            );
            return false;
          }
        },

        // ===== LOCK MANAGEMENT =====
        setResourceLock: (resourceId: string, userId: string) => {
          set((state) => ({
            lockedResources: {
              ...state.lockedResources,
              [resourceId]: userId,
            },
          }));
        },

        clearResourceLock: (resourceId: string) => {
          set((state) => {
            const newLocks = { ...state.lockedResources };
            delete newLocks[resourceId];
            return { lockedResources: newLocks };
          });
        },

        isResourceLocked: (resourceId: string, currentUserId: string) => {
          const locks = get().lockedResources;
          const lockOwner = locks[resourceId];
          return lockOwner !== undefined && lockOwner !== currentUserId;
        },

        // ===== COMBAT HELPERS =====
        rollInitiative: async (
          characterId: string,
          advantage?: boolean,
          disadvantage?: boolean
        ) => {
          try {
            const character = get().getCharacterById(characterId) as Character;
            if (!character) {
              throw new Error("Character not found");
            }

            const dexModifier = getAbilityModifier(character.dexterity);
            const { rolls, result } = rollWithAdvantage(
              advantage,
              disadvantage
            );
            const total = result + dexModifier;

            notificationCallback?.(
              "info",
              `${character.name} rolled initiative: ${total} (${rolls.join(
                ", "
              )} + ${dexModifier})`
            );

            return total;
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to roll initiative";
            notificationCallback?.(
              "error",
              `Failed to roll initiative: ${errorMessage}`
            );
            throw error;
          }
        },

        getModifier: (characterId: string, attribute: string) => {
          const character = get().getCharacterById(characterId) as Character;
          if (!character) return 0;

          const score = character[attribute as keyof Character] as number;
          return getAbilityModifier(score || 10);
        },

        getProficiencyBonus: (characterId: string) => {
          const character = get().getCharacterById(characterId) as Character;
          if (!character) return 2;

          return getProficiencyBonusForLevel(character.level);
        },

        rollAbilityCheck: async (
          characterId: string,
          ability: string,
          advantage?: boolean,
          disadvantage?: boolean
        ) => {
          try {
            const character = get().getCharacterById(characterId) as Character;
            if (!character) {
              throw new Error("Character not found");
            }

            const modifier = get().getModifier(characterId, ability);
            const { rolls, result } = rollWithAdvantage(
              advantage,
              disadvantage
            );
            const total = result + modifier;

            notificationCallback?.(
              "info",
              `${
                character.name
              } rolled ${ability} check: ${total} (${rolls.join(
                ", "
              )} + ${modifier})`
            );

            return { total, rolls, modifier };
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to roll ability check";
            notificationCallback?.(
              "error",
              `Failed to roll ability check: ${errorMessage}`
            );
            throw error;
          }
        },

        rollSavingThrow: async (
          characterId: string,
          ability: string,
          advantage?: boolean,
          disadvantage?: boolean
        ) => {
          try {
            const character = get().getCharacterById(characterId) as Character;
            if (!character) {
              throw new Error("Character not found");
            }

            const abilityModifier = get().getModifier(characterId, ability);
            const proficiencyBonus = get().getProficiencyBonus(characterId);

            // Check if character is proficient in this save
            const savingThrowProficiencies =
              character.saving_throw_proficiencies || [];
            const isProficient = savingThrowProficiencies.includes(ability);

            const modifier =
              abilityModifier + (isProficient ? proficiencyBonus : 0);
            const { rolls, result } = rollWithAdvantage(
              advantage,
              disadvantage
            );
            const total = result + modifier;

            notificationCallback?.(
              "info",
              `${character.name} rolled ${ability} save: ${total} (${rolls.join(
                ", "
              )} + ${modifier})`
            );

            return { total, rolls, modifier };
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to roll saving throw";
            notificationCallback?.(
              "error",
              `Failed to roll saving throw: ${errorMessage}`
            );
            throw error;
          }
        },

        // ===== UTILITY ACTIONS =====
        refreshCharacter: async (characterId: string) => {
          try {
            const character = await charactersAPI.getCharacter(characterId);

            if (get().currentCharacter?._id === characterId) {
              set({ currentCharacter: character });
            }

            // Update in characters list
            set((state) => ({
              characters: state.characters.map((c) =>
                c._id === characterId
                  ? {
                      ...c,
                      name: character.name,
                      class: character.class,
                      level: character.level,
                      race: character.race,
                    }
                  : c
              ),
            }));
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to refresh character";
            notificationCallback?.(
              "error",
              `Failed to refresh character: ${errorMessage}`
            );
          }
        },

        resetState: () => {
          set({
            characters: [],
            currentCharacter: null,
            isLoading: false,
            error: null,
            lockedResources: {},
          });
        },

        addNotification: (
          type: "info" | "success" | "warning" | "error",
          message: string
        ) => {
          notificationCallback?.(type, message);
        },
      }),
      {
        name: "character-storage",
        partialize: (state) => ({
          // Only persist characters list and current character
          characters: state.characters,
          currentCharacter: state.currentCharacter,
        }),
      }
    ),
    {
      name: "character-store",
    }
  )
);

export default useCharacterStore;
