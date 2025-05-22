// store/storeConnections.ts
// Este arquivo estabelece conexões seguras entre os stores sem dependências circulares

import { useGameStore } from "./gameStore";
import { useCharacterStore } from "./characterStore";
import { useCombatStore } from "./combatStore";
import { useNPCStore } from "./npcStore"; // Quando implementado

/**
 * Inicializa as conexões entre stores
 * Deve ser chamado uma vez na inicialização da aplicação
 */
export function initializeStoreConnections() {
  const gameStore = useGameStore.getState();

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
  // Se necessário implementar cleanup específico dos callbacks
}

/**
 * Hook personalizado para usar em componentes que precisam reagir a mudanças de campanha
 */
export function useStoreSync() {
  const gameStore = useGameStore();
  const characterStore = useCharacterStore();
  const combatStore = useCombatStore();

  return {
    // Estado sincronizado
    currentCampaign: gameStore.currentCampaign,
    isLoading:
      gameStore.isLoading || characterStore.isLoading || combatStore.isLoading,

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
    },
  };
}
