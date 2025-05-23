// src/stores/storeConnections.ts
import { useGameStore } from "./gameStore";
import {
  useCharacterStore,
  setCharacterNotificationCallback,
} from "./characterStore";
import {
  useCombatStore,
  setCombatNotificationCallback,
  setCombatDataCallbacks,
} from "./combatStore";
import { useNPCStore, setNPCNotificationCallback } from "./npcStore";

/**
 * Inicializa as conexões entre stores
 * Deve ser chamado uma vez na inicialização da aplicação
 */
export function initializeStoreConnections() {
  const gameStore = useGameStore.getState();

  // Configure notification callbacks para todos os stores usarem o gameStore
  const notificationCallback = gameStore.addNotification;

  setCharacterNotificationCallback(notificationCallback);
  setCombatNotificationCallback(notificationCallback);
  setNPCNotificationCallback(notificationCallback);

  // Configure data callbacks para o combat store
  const getCharacterCallback = (characterId: string) => {
    const characterStore = useCharacterStore.getState();
    const character = characterStore.getCharacterById(characterId);
    return character ? { name: character.name } : null;
  };

  const getNPCCallback = (npcId: string) => {
    const npcStore = useNPCStore.getState();
    const npc = npcStore.getNPCById(npcId);
    return npc ? { name: npc.name } : null;
  };

  setCombatDataCallbacks(getCharacterCallback, getNPCCallback);

  // Conectar character store às mudanças de campanha
  gameStore.onCampaignChange((campaign) => {
    const characterStore = useCharacterStore.getState();

    if (campaign) {
      // Carregar personagens da nova campanha
      characterStore.fetchCharacters(campaign._id);
    } else {
      // Limpar dados quando não há campanha ativa
      characterStore.resetState();
    }
  });

  // Conectar combat store às mudanças de campanha
  gameStore.onCampaignChange((campaign) => {
    const combatStore = useCombatStore.getState();

    if (campaign) {
      // Verificar se há combate ativo na nova campanha
      combatStore.fetchActiveCombat(campaign._id);
    } else {
      // Limpar dados de combate quando não há campanha ativa
      combatStore.resetState();
    }
  });

  // Conectar NPC store às mudanças de campanha
  gameStore.onCampaignChange((campaign) => {
    const npcStore = useNPCStore.getState();

    if (campaign) {
      npcStore.fetchNPCs(campaign._id);
    } else {
      npcStore.resetState();
    }
  });
}

/**
 * Limpa todas as conexões entre stores
 * Útil para cleanup ou testes
 */
export function cleanupStoreConnections() {
  // Limpar callbacks
  setCharacterNotificationCallback(null);
  setCombatNotificationCallback(null);
  setNPCNotificationCallback(null);
  setCombatDataCallbacks(null, null);
}

/**
 * Hook personalizado para usar em componentes que precisam reagir a mudanças de campanha
 */
export function useStoreSync() {
  const gameStore = useGameStore();
  const characterStore = useCharacterStore();
  const combatStore = useCombatStore();
  const npcStore = useNPCStore();

  return {
    // Estado sincronizado
    currentCampaign: gameStore.currentCampaign,
    isLoading:
      gameStore.isLoading ||
      characterStore.isLoading ||
      combatStore.isLoading ||
      npcStore.isLoading,

    // Ações que afetam múltiplos stores
    switchCampaign: async (campaignId: string) => {
      const campaign = await gameStore.fetchCampaign(campaignId);
      if (campaign) {
        gameStore.setCurrentCampaign(campaign);
        // Os callbacks cuidarão de atualizar os outros stores
      }
    },

    // Reset global
    resetAllStores: () => {
      gameStore.resetState();
      characterStore.resetState();
      combatStore.resetState();
      npcStore.resetState();
    },
  };
}
