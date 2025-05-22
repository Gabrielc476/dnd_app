// store/characterStore.ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { Character, CharacterListItem } from "@/lib/types";
import { charactersAPI } from "@/lib/api";
import { formatModifier, getProficiencyBonus } from "@/lib/utils";

interface CharacterState {
  // State
  characters: CharacterListItem[];
  currentCharacter: Character | null;
  isLoading: boolean;
  error: string | null;
  lockedResources: Record<string, string>; // resourceId -> userId who locked it

  // Actions
  fetchCharacters: (campaignId?: string) => Promise<CharacterListItem[]>;
  fetchCharacter: (characterId: string) => Promise<Character | null>;
  setCurrentCharacter: (character: Character | null) => void;
  updateCharacter: (
    characterId: string,
    updates: Partial<Character>
  ) => Promise<boolean>;
  createCharacter: (
    characterData: Partial<Character>
  ) => Promise<Character | null>;
  deleteCharacter: (characterId: string) => Promise<boolean>;
  updateHP: (
    characterId: string,
    hpChange: number,
    isTemp?: boolean
  ) => Promise<boolean>;
  addCondition: (characterId: string, condition: string) => Promise<boolean>;
  removeCondition: (characterId: string, condition: string) => Promise<boolean>;

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

  // Reset state
  resetState: () => void;
}

export const useCharacterStore = create<CharacterState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        characters: [],
        currentCharacter: null,
        isLoading: false,
        error: null,
        lockedResources: {},

        // Actions
        fetchCharacters: async (campaignId?: string) => {
          set({ isLoading: true, error: null });
          try {
            let characters: CharacterListItem[];

            if (campaignId) {
              characters = await charactersAPI.listCampaignCharacters(
                campaignId
              );
            } else {
              characters = await charactersAPI.listMyCharacters();
            }

            set({ characters, isLoading: false });
            return characters;
          } catch (error: any) {
            set({
              error: error.message || "Failed to fetch characters",
              isLoading: false,
            });
            return [];
          }
        },

        fetchCharacter: async (characterId: string) => {
          set({ isLoading: true, error: null });
          try {
            const character = await charactersAPI.getCharacter(characterId);
            set({ currentCharacter: character, isLoading: false });
            return character;
          } catch (error: any) {
            set({
              error: error.message || "Failed to fetch character",
              isLoading: false,
            });
            return null;
          }
        },

        setCurrentCharacter: (character: Character | null) => {
          set({ currentCharacter: character });
        },

        updateCharacter: async (
          characterId: string,
          updates: Partial<Character>
        ) => {
          set({ isLoading: true, error: null });
          try {
            const updatedCharacter = await charactersAPI.updateCharacter(
              characterId,
              updates
            );

            if (
              get().currentCharacter &&
              get().currentCharacter._id === characterId
            ) {
              set({ currentCharacter: updatedCharacter });
            }

            // Update the character in the list (only basic info)
            const updatedCharacters = get().characters.map((char) =>
              char._id === characterId
                ? {
                    ...char,
                    name: updates.name || char.name,
                    level: updates.level || char.level,
                    race: updates.race || char.race,
                    class: updates.class || char.class,
                    hp: updates.hp || char.hp,
                  }
                : char
            );

            set({ characters: updatedCharacters, isLoading: false });
            return true;
          } catch (error: any) {
            set({
              error: error.message || "Failed to update character",
              isLoading: false,
            });
            return false;
          }
        },

        createCharacter: async (characterData: Partial<Character>) => {
          set({ isLoading: true, error: null });
          try {
            const newCharacter = await charactersAPI.createCharacter(
              characterData
            );

            // Add to character list
            set((state) => ({
              characters: [
                ...state.characters,
                {
                  _id: newCharacter._id,
                  name: newCharacter.name,
                  owner_id: newCharacter.owner_id,
                  level: newCharacter.level,
                  race: newCharacter.race,
                  class: newCharacter.class,
                  hp: newCharacter.hp,
                },
              ],
              isLoading: false,
            }));

            return newCharacter;
          } catch (error: any) {
            set({
              error: error.message || "Failed to create character",
              isLoading: false,
            });
            return null;
          }
        },

        deleteCharacter: async (characterId: string) => {
          set({ isLoading: true, error: null });
          try {
            await charactersAPI.deleteCharacter(characterId);

            // Remove from character list
            set((state) => ({
              characters: state.characters.filter(
                (char) => char._id !== characterId
              ),
              currentCharacter:
                state.currentCharacter?._id === characterId
                  ? null
                  : state.currentCharacter,
              isLoading: false,
            }));

            return true;
          } catch (error: any) {
            set({
              error: error.message || "Failed to delete character",
              isLoading: false,
            });
            return false;
          }
        },

        updateHP: async (
          characterId: string,
          hpChange: number,
          isTemp: boolean = false
        ) => {
          set({ isLoading: true, error: null });
          try {
            const updatedCharacter = await charactersAPI.updateHP(
              characterId,
              hpChange,
              isTemp
            );

            // Update current character if it's the same one
            if (
              get().currentCharacter &&
              get().currentCharacter._id === characterId
            ) {
              set({ currentCharacter: updatedCharacter });
            }

            // Update character in list (only update hp field which exists in CharacterListItem)
            const updatedCharacters = get().characters.map((char) => {
              if (char._id === characterId && !isTemp) {
                return {
                  ...char,
                  hp: updatedCharacter.hp,
                };
              }
              return char;
            });

            set({ characters: updatedCharacters, isLoading: false });
            return true;
          } catch (error: any) {
            set({
              error: error.message || "Failed to update HP",
              isLoading: false,
            });
            return false;
          }
        },

        addCondition: async (characterId: string, condition: string) => {
          set({ isLoading: true, error: null });
          try {
            const updatedCharacter = await charactersAPI.addCondition(
              characterId,
              condition
            );

            // Update current character if it's the same one
            if (
              get().currentCharacter &&
              get().currentCharacter._id === characterId
            ) {
              set({ currentCharacter: updatedCharacter });
            }

            set({ isLoading: false });
            return true;
          } catch (error: any) {
            set({
              error: error.message || "Failed to add condition",
              isLoading: false,
            });
            return false;
          }
        },

        removeCondition: async (characterId: string, condition: string) => {
          set({ isLoading: true, error: null });
          try {
            const updatedCharacter = await charactersAPI.removeCondition(
              characterId,
              condition
            );

            // Update current character if it's the same one
            if (
              get().currentCharacter &&
              get().currentCharacter._id === characterId
            ) {
              set({ currentCharacter: updatedCharacter });
            }

            set({ isLoading: false });
            return true;
          } catch (error: any) {
            set({
              error: error.message || "Failed to remove condition",
              isLoading: false,
            });
            return false;
          }
        },

        // Lock management
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
            const newLockedResources = { ...state.lockedResources };
            delete newLockedResources[resourceId];
            return { lockedResources: newLockedResources };
          });
        },

        isResourceLocked: (resourceId: string, currentUserId: string) => {
          const lockUserId = get().lockedResources[resourceId];
          return !!lockUserId && lockUserId !== currentUserId;
        },

        // Combat helpers
        rollInitiative: async (
          characterId: string,
          advantage = false,
          disadvantage = false
        ) => {
          // First check if we have the full character loaded
          let character: Character | null = null;

          if (get().currentCharacter?._id === characterId) {
            character = get().currentCharacter;
          } else {
            // Need to fetch the full character data
            character = await get().fetchCharacter(characterId);
          }

          if (!character) return 0;

          // Calculate initiative modifier
          let initiativeBonus = character.initiative_bonus || 0;
          const dexMod = Math.floor((character.attributes.dexterity - 10) / 2);
          initiativeBonus += dexMod;

          // Simulate dice roll (should use WebSocket in production)
          const roll1 = Math.floor(Math.random() * 20) + 1;
          const roll2 = Math.floor(Math.random() * 20) + 1;

          let result;
          if (advantage && !disadvantage) {
            result = Math.max(roll1, roll2) + initiativeBonus;
          } else if (disadvantage && !advantage) {
            result = Math.min(roll1, roll2) + initiativeBonus;
          } else {
            result = roll1 + initiativeBonus;
          }

          return result;
        },

        getModifier: (characterId: string, attribute: string) => {
          // Only use currentCharacter if it matches the requested ID
          const character =
            get().currentCharacter?._id === characterId
              ? get().currentCharacter
              : null;

          if (
            !character ||
            !character.attributes ||
            !(attribute in character.attributes)
          ) {
            return 0;
          }

          const attrValue =
            character.attributes[
              attribute as keyof typeof character.attributes
            ];
          return Math.floor((attrValue - 10) / 2);
        },

        getProficiencyBonus: (characterId: string) => {
          // Check if currentCharacter matches the requested ID
          if (get().currentCharacter?._id === characterId) {
            return getProficiencyBonus(get().currentCharacter.level);
          }

          // Try to find in the character list (but we only have basic info)
          const characterListItem = get().characters.find(
            (c) => c._id === characterId
          );
          if (characterListItem) {
            return getProficiencyBonus(characterListItem.level);
          }

          return 2; // Default for level 1
        },

        // Reset state
        resetState: () => {
          set({
            characters: [],
            currentCharacter: null,
            isLoading: false,
            error: null,
            lockedResources: {},
          });
        },
      }),
      {
        name: "character-store",
        partialize: (state) => ({
          // Only persist these fields
          characters: state.characters,
          // Don't persist currentCharacter, loading states, errors or locks
        }),
      }
    )
  )
);

export default useCharacterStore;
