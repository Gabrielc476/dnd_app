// store/index.ts
export { useCharacterStore } from "./characterStore";
export { useCombatStore } from "./combatStore";
export { useGameStore } from "./gameStore";

// Define a StoreProvider for convenience in server components
// or components that need access to multiple stores
import React, { createContext, useContext, ReactNode } from "react";
import { useCharacterStore } from "./characterStore";
import { useCombatStore } from "./combatStore";
import { useGameStore } from "./gameStore";

interface StoreContextType {
  characterStore: ReturnType<typeof useCharacterStore.getState>;
  combatStore: ReturnType<typeof useCombatStore.getState>;
  gameStore: ReturnType<typeof useGameStore.getState>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Get store states
  const characterStore = useCharacterStore.getState();
  const combatStore = useCombatStore.getState();
  const gameStore = useGameStore.getState();

  return (
    <StoreContext.Provider
      value={{
        characterStore,
        combatStore,
        gameStore,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
};
