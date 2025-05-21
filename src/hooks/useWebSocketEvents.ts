// hooks/useWebSocketEvents.ts
import { useState, useEffect, useCallback } from "react";
import { useWebSocket } from "@/lib/socket";
import {
  CharacterEvent,
  CombatEvent,
  LockEvent,
  ImageEvent,
  SpellEvent,
  SystemEvent,
} from "@/lib/types";

/**
 * Event handler types
 */
export type EventHandler<T> = (eventData: T) => void;

/**
 * Props for the useWebSocketEvents hook
 */
export interface UseWebSocketEventsProps {
  campaignId: string;
  userId: string;
}

/**
 * Return type for the useWebSocketEvents hook
 */
export interface UseWebSocketEventsReturn {
  connected: boolean;
  error: string | null;
  sendMessage: (messageType: string, data: any) => boolean;
  addCharacterEventListener: (handler: EventHandler<CharacterEvent>) => void;
  removeCharacterEventListener: (handler: EventHandler<CharacterEvent>) => void;
  addCombatEventListener: (handler: EventHandler<CombatEvent>) => void;
  removeCombatEventListener: (handler: EventHandler<CombatEvent>) => void;
  addLockEventListener: (handler: EventHandler<LockEvent>) => void;
  removeLockEventListener: (handler: EventHandler<LockEvent>) => void;
  addImageEventListener: (handler: EventHandler<ImageEvent>) => void;
  removeImageEventListener: (handler: EventHandler<ImageEvent>) => void;
  addSpellEventListener: (handler: EventHandler<SpellEvent>) => void;
  removeSpellEventListener: (handler: EventHandler<SpellEvent>) => void;
  addSystemEventListener: (handler: EventHandler<SystemEvent>) => void;
  removeSystemEventListener: (handler: EventHandler<SystemEvent>) => void;
}

/**
 * Custom hook for managing WebSocket event listeners
 *
 * This hook allows components to subscribe to specific types of WebSocket events
 * without having to manage the socket connection or event handling themselves.
 */
export function useWebSocketEvents({
  campaignId,
  userId,
}: UseWebSocketEventsProps): UseWebSocketEventsReturn {
  // Event handlers for different message types
  const [characterHandlers, setCharacterHandlers] = useState<
    EventHandler<CharacterEvent>[]
  >([]);
  const [combatHandlers, setCombatHandlers] = useState<
    EventHandler<CombatEvent>[]
  >([]);
  const [lockHandlers, setLockHandlers] = useState<EventHandler<LockEvent>[]>(
    []
  );
  const [imageHandlers, setImageHandlers] = useState<
    EventHandler<ImageEvent>[]
  >([]);
  const [spellHandlers, setSpellHandlers] = useState<
    EventHandler<SpellEvent>[]
  >([]);
  const [systemHandlers, setSystemHandlers] = useState<
    EventHandler<SystemEvent>[]
  >([]);

  // WebSocket connection
  const { socket, connected, error, sendMessage } = useWebSocket(
    campaignId,
    userId,
    handleWebSocketMessage
  );

  /**
   * Handle incoming WebSocket messages
   */
  function handleWebSocketMessage(message: { event: string; data: any }) {
    const { event, data } = message;

    // Handle different event types
    switch (event) {
      case "character":
        characterHandlers.forEach((handler) => handler(data as CharacterEvent));
        break;
      case "combat":
        combatHandlers.forEach((handler) => handler(data as CombatEvent));
        break;
      case "lock":
        lockHandlers.forEach((handler) => handler(data as LockEvent));
        break;
      case "image":
        imageHandlers.forEach((handler) => handler(data as ImageEvent));
        break;
      case "spell":
        spellHandlers.forEach((handler) => handler(data as SpellEvent));
        break;
      case "system":
        systemHandlers.forEach((handler) => handler(data as SystemEvent));
        break;
      default:
        console.log(`Unhandled WebSocket event type: ${event}`, data);
    }
  }

  /**
   * Add character event listener
   */
  const addCharacterEventListener = useCallback(
    (handler: EventHandler<CharacterEvent>) => {
      setCharacterHandlers((prev) => [...prev, handler]);
    },
    []
  );

  /**
   * Remove character event listener
   */
  const removeCharacterEventListener = useCallback(
    (handler: EventHandler<CharacterEvent>) => {
      setCharacterHandlers((prev) => prev.filter((h) => h !== handler));
    },
    []
  );

  /**
   * Add combat event listener
   */
  const addCombatEventListener = useCallback(
    (handler: EventHandler<CombatEvent>) => {
      setCombatHandlers((prev) => [...prev, handler]);
    },
    []
  );

  /**
   * Remove combat event listener
   */
  const removeCombatEventListener = useCallback(
    (handler: EventHandler<CombatEvent>) => {
      setCombatHandlers((prev) => prev.filter((h) => h !== handler));
    },
    []
  );

  /**
   * Add lock event listener
   */
  const addLockEventListener = useCallback(
    (handler: EventHandler<LockEvent>) => {
      setLockHandlers((prev) => [...prev, handler]);
    },
    []
  );

  /**
   * Remove lock event listener
   */
  const removeLockEventListener = useCallback(
    (handler: EventHandler<LockEvent>) => {
      setLockHandlers((prev) => prev.filter((h) => h !== handler));
    },
    []
  );

  /**
   * Add image event listener
   */
  const addImageEventListener = useCallback(
    (handler: EventHandler<ImageEvent>) => {
      setImageHandlers((prev) => [...prev, handler]);
    },
    []
  );

  /**
   * Remove image event listener
   */
  const removeImageEventListener = useCallback(
    (handler: EventHandler<ImageEvent>) => {
      setImageHandlers((prev) => prev.filter((h) => h !== handler));
    },
    []
  );

  /**
   * Add spell event listener
   */
  const addSpellEventListener = useCallback(
    (handler: EventHandler<SpellEvent>) => {
      setSpellHandlers((prev) => [...prev, handler]);
    },
    []
  );

  /**
   * Remove spell event listener
   */
  const removeSpellEventListener = useCallback(
    (handler: EventHandler<SpellEvent>) => {
      setSpellHandlers((prev) => prev.filter((h) => h !== handler));
    },
    []
  );

  /**
   * Add system event listener
   */
  const addSystemEventListener = useCallback(
    (handler: EventHandler<SystemEvent>) => {
      setSystemHandlers((prev) => [...prev, handler]);
    },
    []
  );

  /**
   * Remove system event listener
   */
  const removeSystemEventListener = useCallback(
    (handler: EventHandler<SystemEvent>) => {
      setSystemHandlers((prev) => prev.filter((h) => h !== handler));
    },
    []
  );

  return {
    connected,
    error,
    sendMessage,
    addCharacterEventListener,
    removeCharacterEventListener,
    addCombatEventListener,
    removeCombatEventListener,
    addLockEventListener,
    removeLockEventListener,
    addImageEventListener,
    removeImageEventListener,
    addSpellEventListener,
    removeSpellEventListener,
    addSystemEventListener,
    removeSystemEventListener,
  };
}

export default useWebSocketEvents;
