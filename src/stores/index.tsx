// src/stores/index.ts
import React, { createContext, useContext, ReactNode, useEffect } from "react";
import { useCharacterStore } from "./characterStore";
import { useCombatStore } from "./combatStore";
import { useGameStore } from "./gameStore";
import { useNPCStore } from "./npcStore";
import { initializeStoreConnections } from "./storeConnections";

// Re-export stores
export { useCharacterStore } from "./characterStore";
export { useCombatStore } from "./combatStore";
export { useGameStore } from "./gameStore";
export { useNPCStore } from "./npcStore";
export {
  initializeStoreConnections,
  cleanupStoreConnections,
  useStoreSync,
} from "./storeConnections";

// Store context interface
interface StoreContextType {
  characterStore: ReturnType<typeof useCharacterStore>;
  combatStore: ReturnType<typeof useCombatStore>;
  gameStore: ReturnType<typeof useGameStore>;
  npcStore: ReturnType<typeof useNPCStore>;
}

// Create context
const StoreContext = createContext<StoreContextType | null>(null);

// Store Provider component
export const StoreProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Get store hooks (not state)
  const characterStore = useCharacterStore();
  const combatStore = useCombatStore();
  const gameStore = useGameStore();
  const npcStore = useNPCStore();

  // Initialize store connections once
  useEffect(() => {
    initializeStoreConnections();
  }, []);

  return (
    <StoreContext.Provider
      value={{
        characterStore,
        combatStore,
        gameStore,
        npcStore,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

// Hook to use stores
export const useStores = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStores must be used within a StoreProvider");
  }
  return context;
};

// Função utilitária para inicializar todos os stores na aplicação
export const initializeStores = () => {
  // Inicializar conexões entre stores
  initializeStoreConnections();

  // Aqui você pode adicionar outras inicializações necessárias
  console.log("Stores initialized successfully");
};
