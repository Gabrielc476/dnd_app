// lib/socket.ts
import { io, Socket } from "socket.io-client";
import { useState, useEffect, useCallback } from "react";
import { LockEvent } from "./types";

// API base URL from environment variable
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Type for WebSocket response events
interface WebSocketMessage {
  event: string;
  data: any;
}

// Server response lock event (different from client request LockEvent)
interface ServerLockEvent {
  type: "lock";
  action: "acquired" | "released" | "success" | "failed" | "status";
  resource_id: string;
  resource_type: string;
  locked_by?: string;
  message?: string;
  is_locked?: boolean;
}

/**
 * Custom hook for WebSocket connection
 */
export const useWebSocket = (
  campaignId: string,
  userId: string,
  onMessage?: (data: WebSocketMessage) => void
) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Don't connect if campaign ID or user ID is missing
    if (!campaignId || !userId) return;

    // Get auth token from localStorage
    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("Authentication token not found");
      return;
    }

    // Create Socket.IO connection
    const socketInstance = io(`${API_URL}/ws/campaign/${campaignId}`, {
      auth: {
        token,
      },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Set up event listeners
    socketInstance.on("connect", () => {
      console.log("Connected to WebSocket server");
      setConnected(true);
      setError(null);
    });

    socketInstance.on("disconnect", () => {
      console.log("Disconnected from WebSocket server");
      setConnected(false);
    });

    socketInstance.on("error", (err: Error) => {
      console.error("WebSocket error:", err);
      setError(err.message || "Connection error");
    });

    socketInstance.on("connect_error", (err: Error) => {
      console.error("WebSocket connection error:", err);
      setError(`Connection error: ${err.message}`);
    });

    // Catch all socket events and pass to onMessage callback if provided
    if (onMessage) {
      socketInstance.onAny((eventName: string, ...args: any[]) => {
        onMessage({ event: eventName, data: args[0] });
      });
    }

    // Set socket instance
    setSocket(socketInstance);

    // Ping every 30 seconds to keep connection alive
    const pingInterval = setInterval(() => {
      if (socketInstance.connected) {
        socketInstance.emit("ping", { timestamp: new Date().toISOString() });
      }
    }, 30000);

    // Clean up on unmount
    return () => {
      clearInterval(pingInterval);
      socketInstance.disconnect();
    };
  }, [campaignId, userId, onMessage]);

  /**
   * Send message through WebSocket
   */
  const sendMessage = useCallback(
    (messageType: string, data: any): boolean => {
      if (!socket || !connected) {
        console.error("Cannot send message, socket not connected");
        return false;
      }

      try {
        socket.emit(messageType, data);
        return true;
      } catch (err: unknown) {
        console.error("Error sending socket message:", err);
        return false;
      }
    },
    [socket, connected]
  );

  return { socket, connected, error, sendMessage };
};

/**
 * Custom hook for WebSocket with locks management
 */
export const useWebSocketWithLocks = (campaignId: string, userId: string) => {
  const [locks, setLocks] = useState<Record<string, string>>({});
  const { socket, connected, error, sendMessage } = useWebSocket(
    campaignId,
    userId,
    handleLockMessages
  );

  /**
   * Handle lock-related messages
   */
  function handleLockMessages(message: WebSocketMessage): void {
    if (message.event === "lock") {
      const data = message.data as ServerLockEvent;

      if (data.action === "acquired") {
        setLocks((prev) => ({
          ...prev,
          [`${data.resource_type}:${data.resource_id}`]: data.locked_by || "",
        }));
      } else if (data.action === "released") {
        setLocks((prev) => {
          const newLocks = { ...prev };
          delete newLocks[`${data.resource_type}:${data.resource_id}`];
          return newLocks;
        });
      }
    }
  }

  // Heartbeat to keep locks alive
  useEffect(() => {
    if (!connected) return;

    const interval = setInterval(() => {
      Object.entries(locks).forEach(([key, lockedBy]) => {
        if (lockedBy === userId) {
          const [resourceType, resourceId] = key.split(":");
          sendMessage("lock", {
            type: "lock",
            action: "heartbeat",
            resource_id: resourceId,
            resource_type: resourceType,
          });
        }
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [connected, locks, userId, sendMessage]);

  /**
   * Acquire a lock
   */
  const acquireLock = useCallback(
    (
      resourceId: string,
      resourceType: string,
      duration?: number
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        if (!socket || !connected) {
          console.error("Cannot acquire lock, socket not connected");
          resolve(false);
          return;
        }

        const lockEvent: LockEvent = {
          type: "lock",
          action: "acquire",
          resource_id: resourceId,
          resource_type: resourceType,
        };

        if (duration) {
          lockEvent.duration = duration;
        }

        // Setup one-time listener for lock response
        const handleLockResponse = (data: ServerLockEvent) => {
          if (
            data.resource_id === resourceId &&
            data.resource_type === resourceType &&
            (data.action === "success" || data.action === "failed")
          ) {
            // Remove this one-time listener
            socket.off("lock", handleLockResponse);
            resolve(data.action === "success");
          }
        };

        socket.on("lock", handleLockResponse);

        // Send lock request
        socket.emit("lock", lockEvent);

        // Set timeout to prevent waiting indefinitely
        setTimeout(() => {
          socket.off("lock", handleLockResponse);
          console.error("Lock request timed out");
          resolve(false);
        }, 5000);
      });
    },
    [socket, connected]
  );

  /**
   * Release a lock
   */
  const releaseLock = useCallback(
    (resourceId: string, resourceType: string): void => {
      if (!socket || !connected) {
        console.error("Cannot release lock, socket not connected");
        return;
      }

      socket.emit("lock", {
        type: "lock",
        action: "release",
        resource_id: resourceId,
        resource_type: resourceType,
      });
    },
    [socket, connected]
  );

  /**
   * Check if a resource is locked by another user
   */
  const isLocked = useCallback(
    (resourceId: string, resourceType: string): boolean => {
      const key = `${resourceType}:${resourceId}`;
      return locks[key] !== undefined && locks[key] !== userId;
    },
    [locks, userId]
  );

  /**
   * Get the ID of the user who has the lock
   */
  const whoLocked = useCallback(
    (resourceId: string, resourceType: string): string | null => {
      const key = `${resourceType}:${resourceId}`;
      return locks[key] || null;
    },
    [locks]
  );

  /**
   * Check lock status
   */
  const checkLockStatus = useCallback(
    (
      resourceId: string,
      resourceType: string
    ): Promise<{ is_locked: boolean; locked_by?: string }> => {
      return new Promise((resolve) => {
        if (!socket || !connected) {
          console.error("Cannot check lock status, socket not connected");
          resolve({ is_locked: false });
          return;
        }

        // Setup one-time listener for status response
        const handleStatusResponse = (data: ServerLockEvent) => {
          if (
            data.action === "status" &&
            data.resource_id === resourceId &&
            data.resource_type === resourceType
          ) {
            // Remove this one-time listener
            socket.off("lock", handleStatusResponse);
            resolve({
              is_locked: !!data.is_locked,
              locked_by: data.locked_by,
            });
          }
        };

        socket.on("lock", handleStatusResponse);

        // Send status request
        socket.emit("lock", {
          type: "lock",
          action: "status",
          resource_id: resourceId,
          resource_type: resourceType,
        });

        // Set timeout to prevent waiting indefinitely
        setTimeout(() => {
          socket.off("lock", handleStatusResponse);
          console.error("Lock status request timed out");
          resolve({ is_locked: false });
        }, 3000);
      });
    },
    [socket, connected]
  );

  return {
    socket,
    connected,
    error,
    sendMessage,
    acquireLock,
    releaseLock,
    isLocked,
    whoLocked,
    checkLockStatus,
    locks,
  };
};

/**
 * Custom hook for WebSocket character events
 */
export const useCharacterSocket = (
  campaignId: string,
  userId: string,
  characterId?: string
) => {
  const {
    socket,
    connected,
    error,
    sendMessage,
    acquireLock,
    releaseLock,
    isLocked,
    whoLocked,
  } = useWebSocketWithLocks(campaignId, userId);

  /**
   * Update character
   */
  const updateCharacter = useCallback(
    async (
      characterId: string,
      updates: Record<string, any>
    ): Promise<boolean> => {
      // Try to acquire lock
      const lockAcquired = await acquireLock(characterId, "character");
      if (!lockAcquired) return false;

      // Send update
      const success = sendMessage("character", {
        type: "character",
        action: "update",
        character_id: characterId,
        data: updates,
      });

      // Release lock after update
      releaseLock(characterId, "character");

      return success;
    },
    [sendMessage, acquireLock, releaseLock]
  );

  /**
   * Roll ability check
   */
  const rollAbilityCheck = useCallback(
    (
      characterId: string,
      ability: string,
      advantage: boolean = false,
      disadvantage: boolean = false
    ): boolean => {
      return sendMessage("character", {
        type: "character",
        action: "roll",
        roll_type: "ability",
        character_id: characterId,
        attribute: ability,
        advantage,
        disadvantage,
      });
    },
    [sendMessage]
  );

  /**
   * Change HP
   */
  const changeHP = useCallback(
    (characterId: string, change: number, isTemp: boolean = false): boolean => {
      return sendMessage("character", {
        type: "character",
        action: "hp_change",
        character_id: characterId,
        change,
        is_temp: isTemp,
      });
    },
    [sendMessage]
  );

  return {
    socket,
    connected,
    error,
    updateCharacter,
    rollAbilityCheck,
    changeHP,
    acquireLock,
    releaseLock,
    isLocked,
    whoLocked,
  };
};

/**
 * Custom hook for WebSocket combat events
 */
export const useCombatSocket = (
  campaignId: string,
  userId: string,
  combatId?: string
) => {
  const { socket, connected, error, sendMessage } = useWebSocketWithLocks(
    campaignId,
    userId
  );

  /**
   * Start combat
   */
  const startCombat = useCallback(
    (encounterId?: string): boolean => {
      return sendMessage("combat", {
        type: "combat",
        action: "start",
        data: {
          campaign_id: campaignId,
          encounter_id: encounterId,
        },
      });
    },
    [campaignId, sendMessage]
  );

  /**
   * Roll initiative
   */
  const rollInitiative = useCallback(
    (
      entityId: string,
      entityType: "character" | "npc",
      initiativeValue?: number
    ): boolean => {
      return sendMessage("combat", {
        type: "combat",
        action: "roll_initiative",
        data: {
          character_id: entityType === "character" ? entityId : undefined,
          npc_id: entityType === "npc" ? entityId : undefined,
          initiative: initiativeValue,
        },
      });
    },
    [sendMessage]
  );

  /**
   * Next turn
   */
  const nextTurn = useCallback((): boolean => {
    return sendMessage("combat", {
      type: "combat",
      action: "next_turn",
      combat_id: combatId,
    });
  }, [combatId, sendMessage]);

  /**
   * End combat
   */
  const endCombat = useCallback((): boolean => {
    return sendMessage("combat", {
      type: "combat",
      action: "end",
      combat_id: combatId,
    });
  }, [combatId, sendMessage]);

  /**
   * Add condition
   */
  const addCondition = useCallback(
    (
      targetId: string,
      targetType: "character" | "npc",
      condition: string,
      duration: { type: "rounds" | "minutes" | "hours"; value: number }
    ): boolean => {
      return sendMessage("combat", {
        type: "combat",
        action: "add_condition",
        data: {
          combat_id: combatId,
          target_id: targetId,
          target_type: targetType,
          condition,
          duration,
        },
      });
    },
    [combatId, sendMessage]
  );

  /**
   * Remove condition
   */
  const removeCondition = useCallback(
    (conditionId: string): boolean => {
      return sendMessage("combat", {
        type: "combat",
        action: "remove_condition",
        data: {
          combat_id: combatId,
          condition_id: conditionId,
        },
      });
    },
    [combatId, sendMessage]
  );

  return {
    socket,
    connected,
    error,
    startCombat,
    rollInitiative,
    nextTurn,
    endCombat,
    addCondition,
    removeCondition,
  };
};

/**
 * Custom hook for WebSocket image events
 */
export const useImageSocket = (campaignId: string, userId: string) => {
  const { socket, connected, error, sendMessage } = useWebSocketWithLocks(
    campaignId,
    userId
  );

  /**
   * Share image
   */
  const shareImage = useCallback(
    (imageId: string, imageData: Record<string, any>): boolean => {
      return sendMessage("image", {
        type: "image",
        action: "share",
        image_id: imageId,
        data: imageData,
      });
    },
    [sendMessage]
  );

  /**
   * Hide image
   */
  const hideImage = useCallback(
    (imageId: string): boolean => {
      return sendMessage("image", {
        type: "image",
        action: "hide",
        image_id: imageId,
        data: {},
      });
    },
    [sendMessage]
  );

  /**
   * Reveal area
   */
  const revealArea = useCallback(
    (
      imageId: string,
      area: { x: number; y: number; width: number; height: number }
    ): boolean => {
      return sendMessage("image", {
        type: "image",
        action: "reveal",
        image_id: imageId,
        data: { area },
      });
    },
    [sendMessage]
  );

  /**
   * Move token
   */
  const moveToken = useCallback(
    (
      imageId: string,
      tokenId: string,
      position: { x: number; y: number }
    ): boolean => {
      return sendMessage("image", {
        type: "image",
        action: "move_token",
        image_id: imageId,
        data: {
          token_id: tokenId,
          position,
        },
      });
    },
    [sendMessage]
  );

  return {
    socket,
    connected,
    error,
    shareImage,
    hideImage,
    revealArea,
    moveToken,
  };
};

/**
 * Custom hook for WebSocket spell events
 */
export const useSpellSocket = (
  campaignId: string,
  userId: string,
  characterId?: string
) => {
  const {
    socket,
    connected,
    error,
    sendMessage,
    acquireLock,
    releaseLock,
    isLocked,
    whoLocked,
  } = useWebSocketWithLocks(campaignId, userId);

  /**
   * Prepare spell
   */
  const prepareSpell = useCallback(
    async (characterId: string, spellId: string): Promise<boolean> => {
      // Try to acquire lock
      const lockAcquired = await acquireLock(characterId, "character");
      if (!lockAcquired) return false;

      // Send update
      const success = sendMessage("spell", {
        type: "spell",
        action: "prepare",
        character_id: characterId,
        data: {
          spell_id: spellId,
        },
      });

      // Release lock after update
      releaseLock(characterId, "character");

      return success;
    },
    [sendMessage, acquireLock, releaseLock]
  );

  /**
   * Cast spell
   */
  const castSpell = useCallback(
    (
      characterId: string,
      spellId: string,
      spellLevel: number,
      targetIds?: string[]
    ): boolean => {
      return sendMessage("spell", {
        type: "spell",
        action: "cast",
        character_id: characterId,
        data: {
          spell_id: spellId,
          spell_level: spellLevel,
          target_ids: targetIds,
        },
      });
    },
    [sendMessage]
  );

  /**
   * Reset spell slots
   */
  const resetSpellSlots = useCallback(
    async (characterId: string): Promise<boolean> => {
      // Try to acquire lock
      const lockAcquired = await acquireLock(characterId, "character");
      if (!lockAcquired) return false;

      // Send update
      const success = sendMessage("spell", {
        type: "spell",
        action: "reset_slots",
        character_id: characterId,
        data: {},
      });

      // Release lock after update
      releaseLock(characterId, "character");

      return success;
    },
    [sendMessage, acquireLock, releaseLock]
  );

  return {
    socket,
    connected,
    error,
    prepareSpell,
    castSpell,
    resetSpellSlots,
    acquireLock,
    releaseLock,
    isLocked,
    whoLocked,
  };
};
