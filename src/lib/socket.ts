/**
 * WebSocket Layer Frontend - COMPLETAMENTE REFATORADO
 * Problemas resolvidos:
 * 1. ✅ useCharacterSocket() completado (estava cortado)
 * 2. ✅ Proper connection management
 * 3. ✅ Error handling adequado
 * 4. ✅ Event listeners corretos
 * 5. ✅ Reconnection logic
 * 6. ✅ TypeScript types completos
 */

import { io, Socket } from "socket.io-client";
import { useState, useEffect, useCallback, useRef } from "react";
import { LockEvent } from "./types";

// API base URL from environment variable
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ===== TYPES =====
interface WebSocketMessage {
  event: string;
  data: any;
}

interface ServerLockEvent {
  type: "lock";
  action: "acquired" | "released" | "success" | "failed" | "status";
  resource_id: string;
  resource_type: string;
  locked_by?: string;
  message?: string;
  is_locked?: boolean;
}

interface WebSocketOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onMessage?: (data: WebSocketMessage) => void;
  autoReconnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

// ===== BASE WEBSOCKET HOOK =====
export const useWebSocket = (
  campaignId: string,
  userId: string,
  options: WebSocketOptions = {}
) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

  const {
    onConnect,
    onDisconnect,
    onError,
    onMessage,
    autoReconnect = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
  } = options;

  const reconnectAttempts = useRef(0);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  const connectSocket = useCallback(() => {
    // Don't connect if campaign ID or user ID is missing
    if (!campaignId || !userId) {
      setError("Campaign ID or User ID is required");
      return;
    }

    // Get auth token from localStorage
    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("Authentication token not found");
      return;
    }

    console.log(`🔌 Connecting to WebSocket: campaign ${campaignId}`);

    // Create Socket.IO connection
    const socketInstance = io(`${API_URL}/ws/campaign/${campaignId}`, {
      auth: {
        token,
        user_id: userId,
      },
      transports: ["websocket"],
      reconnection: false, // We'll handle reconnection manually
      timeout: 10000,
    });

    // ===== EVENT LISTENERS =====
    socketInstance.on("connect", () => {
      console.log("✅ Connected to WebSocket server");
      setConnected(true);
      setError(null);
      setReconnecting(false);
      reconnectAttempts.current = 0;

      onConnect?.();

      // Start heartbeat
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }

      heartbeatInterval.current = setInterval(() => {
        if (socketInstance.connected) {
          socketInstance.emit("ping", { timestamp: new Date().toISOString() });
        }
      }, 30000);
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("❌ Disconnected from WebSocket server:", reason);
      setConnected(false);

      onDisconnect?.();

      // Clear heartbeat
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }

      // Handle reconnection
      if (autoReconnect && reason !== "io client disconnect") {
        handleReconnection();
      }
    });

    socketInstance.on("error", (err: Error) => {
      console.error("❌ WebSocket error:", err);
      const errorMessage = err.message || "Connection error";
      setError(errorMessage);
      onError?.(err);
    });

    socketInstance.on("connect_error", (err: Error) => {
      console.error("❌ WebSocket connection error:", err);
      const errorMessage = `Connection error: ${err.message}`;
      setError(errorMessage);
      onError?.(err);

      if (autoReconnect) {
        handleReconnection();
      }
    });

    // Handle pong response
    socketInstance.on("pong", (data) => {
      console.log("🏓 Received pong:", data);
    });

    // Catch all socket events and pass to handler
    socketInstance.onAny((eventName, ...args) => {
      console.log(`📨 WebSocket Event: ${eventName}`, args);

      if (onMessage) {
        onMessage({
          event: eventName,
          data: args.length === 1 ? args[0] : args,
        });
      }
    });

    setSocket(socketInstance);
  }, [
    campaignId,
    userId,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
    autoReconnect,
  ]);

  const handleReconnection = useCallback(() => {
    if (reconnectAttempts.current >= reconnectionAttempts) {
      console.error("❌ Max reconnection attempts reached");
      setError("Failed to reconnect to server");
      return;
    }

    reconnectAttempts.current++;
    setReconnecting(true);

    console.log(
      `🔄 Reconnecting... (attempt ${reconnectAttempts.current}/${reconnectionAttempts})`
    );

    setTimeout(() => {
      connectSocket();
    }, reconnectionDelay * reconnectAttempts.current);
  }, [connectSocket, reconnectionAttempts, reconnectionDelay]);

  const disconnect = useCallback(() => {
    if (socket) {
      console.log("🔌 Disconnecting WebSocket");
      socket.disconnect();
      setSocket(null);
      setConnected(false);

      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }
    }
  }, [socket]);

  const emit = useCallback(
    (event: string, data?: any) => {
      if (socket && connected) {
        console.log(`📤 Emitting event: ${event}`, data);
        socket.emit(event, data);
        return true;
      } else {
        console.warn("❌ Cannot emit event - socket not connected");
        return false;
      }
    },
    [socket, connected]
  );

  // Connect on mount
  useEffect(() => {
    connectSocket();

    return () => {
      disconnect();
    };
  }, [connectSocket, disconnect]);

  return {
    socket,
    connected,
    error,
    reconnecting,
    emit,
    disconnect,
    reconnect: connectSocket,
  };
};

// ===== CHARACTER SOCKET HOOK =====
export const useCharacterSocket = (
  campaignId: string,
  userId: string,
  characterId?: string
) => {
  const [characterData, setCharacterData] = useState<any>(null);
  const [characterEvents, setCharacterEvents] = useState<any[]>([]);

  const handleMessage = useCallback(
    (message: WebSocketMessage) => {
      const { event, data } = message;

      switch (event) {
        case "character_updated":
          if (!characterId || data.character_id === characterId) {
            setCharacterData(data.character);
          }
          setCharacterEvents((prev) => [
            ...prev,
            { event, data, timestamp: Date.now() },
          ]);
          break;

        case "character_hp_changed":
        case "character_condition_added":
        case "character_condition_removed":
          if (!characterId || data.character_id === characterId) {
            setCharacterEvents((prev) => [
              ...prev,
              { event, data, timestamp: Date.now() },
            ]);
          }
          break;

        default:
          // Handle other character-related events
          if (event.startsWith("character_")) {
            setCharacterEvents((prev) => [
              ...prev,
              { event, data, timestamp: Date.now() },
            ]);
          }
          break;
      }
    },
    [characterId]
  );

  const { socket, connected, error, emit } = useWebSocket(campaignId, userId, {
    onMessage: handleMessage,
  });

  // Character-specific methods
  const updateCharacter = useCallback(
    (characterId: string, updates: any) => {
      return emit("update_character", {
        character_id: characterId,
        updates,
      });
    },
    [emit]
  );

  const updateHP = useCallback(
    (characterId: string, hpChange: number, isTemp?: boolean) => {
      return emit("update_character_hp", {
        character_id: characterId,
        hp_change: hpChange,
        is_temp: isTemp || false,
      });
    },
    [emit]
  );

  const addCondition = useCallback(
    (characterId: string, condition: string) => {
      return emit("add_character_condition", {
        character_id: characterId,
        condition,
      });
    },
    [emit]
  );

  const removeCondition = useCallback(
    (characterId: string, condition: string) => {
      return emit("remove_character_condition", {
        character_id: characterId,
        condition,
      });
    },
    [emit]
  );

  return {
    socket,
    connected,
    error,
    characterData,
    characterEvents,
    updateCharacter,
    updateHP,
    addCondition,
    removeCondition,
  };
};

// ===== COMBAT SOCKET HOOK =====
export const useCombatSocket = (
  campaignId: string,
  userId: string,
  combatId?: string
) => {
  const [combatData, setCombatData] = useState<any>(null);
  const [combatEvents, setCombatEvents] = useState<any[]>([]);

  const handleMessage = useCallback(
    (message: WebSocketMessage) => {
      const { event, data } = message;

      switch (event) {
        case "combat_started":
        case "combat_ended":
        case "combat_updated":
          if (!combatId || data.combat_id === combatId) {
            setCombatData(data.combat);
          }
          setCombatEvents((prev) => [
            ...prev,
            { event, data, timestamp: Date.now() },
          ]);
          break;

        case "initiative_rolled":
        case "turn_started":
        case "turn_ended":
          if (!combatId || data.combat_id === combatId) {
            setCombatEvents((prev) => [
              ...prev,
              { event, data, timestamp: Date.now() },
            ]);
          }
          break;

        default:
          if (event.startsWith("combat_")) {
            setCombatEvents((prev) => [
              ...prev,
              { event, data, timestamp: Date.now() },
            ]);
          }
          break;
      }
    },
    [combatId]
  );

  const { socket, connected, error, emit } = useWebSocket(campaignId, userId, {
    onMessage: handleMessage,
  });

  // Combat-specific methods
  const startCombat = useCallback(
    (encounterId?: string) => {
      return emit("start_combat", {
        campaign_id: campaignId,
        encounter_id: encounterId,
      });
    },
    [emit, campaignId]
  );

  const endCombat = useCallback(
    (combatId: string) => {
      return emit("end_combat", {
        combat_id: combatId,
      });
    },
    [emit]
  );

  const rollInitiative = useCallback(
    (
      combatId: string,
      entityId: string,
      entityType: "character" | "npc",
      initiativeValue?: number
    ) => {
      return emit("roll_initiative", {
        combat_id: combatId,
        entity_id: entityId,
        entity_type: entityType,
        initiative_value: initiativeValue,
      });
    },
    [emit]
  );

  const nextTurn = useCallback(
    (combatId: string) => {
      return emit("next_turn", {
        combat_id: combatId,
      });
    },
    [emit]
  );

  return {
    socket,
    connected,
    error,
    combatData,
    combatEvents,
    startCombat,
    endCombat,
    rollInitiative,
    nextTurn,
  };
};

// ===== LOCK SOCKET HOOK =====
export const useLockSocket = (campaignId: string, userId: string) => {
  const [locks, setLocks] = useState<Record<string, string>>({});

  const handleMessage = useCallback((message: WebSocketMessage) => {
    const { event, data } = message;

    if (event === "lock_event") {
      const lockData = data as ServerLockEvent;
      const lockKey = `${lockData.resource_type}:${lockData.resource_id}`;

      switch (lockData.action) {
        case "acquired":
          if (lockData.locked_by) {
            setLocks((prev) => ({
              ...prev,
              [lockKey]: lockData.locked_by!,
            }));
          }
          break;

        case "released":
          setLocks((prev) => {
            const newLocks = { ...prev };
            delete newLocks[lockKey];
            return newLocks;
          });
          break;

        case "status":
          if (lockData.is_locked && lockData.locked_by) {
            setLocks((prev) => ({
              ...prev,
              [lockKey]: lockData.locked_by!,
            }));
          } else {
            setLocks((prev) => {
              const newLocks = { ...prev };
              delete newLocks[lockKey];
              return newLocks;
            });
          }
          break;
      }
    }
  }, []);

  const { socket, connected, error, emit } = useWebSocket(campaignId, userId, {
    onMessage: handleMessage,
  });

  // Lock-specific methods
  const acquireLock = useCallback(
    async (
      resourceId: string,
      resourceType: string,
      duration: number = 300
    ): Promise<boolean> => {
      if (!connected) return false;

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(false);
        }, 5000);

        const handleResponse = (response: any) => {
          clearTimeout(timeout);
          socket?.off("lock_response", handleResponse);
          resolve(response.success === true);
        };

        socket?.on("lock_response", handleResponse);

        emit("acquire_lock", {
          resource_id: resourceId,
          resource_type: resourceType,
          duration,
        });
      });
    },
    [connected, emit, socket]
  );

  const releaseLock = useCallback(
    (resourceId: string, resourceType: string) => {
      return emit("release_lock", {
        resource_id: resourceId,
        resource_type: resourceType,
      });
    },
    [emit]
  );

  const checkLockStatus = useCallback(
    async (
      resourceId: string,
      resourceType: string
    ): Promise<{ is_locked: boolean; locked_by?: string }> => {
      if (!connected) return { is_locked: false };

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ is_locked: false });
        }, 5000);

        const handleResponse = (response: any) => {
          clearTimeout(timeout);
          socket?.off("lock_status_response", handleResponse);
          resolve({
            is_locked: response.is_locked || false,
            locked_by: response.locked_by,
          });
        };

        socket?.on("lock_status_response", handleResponse);

        emit("check_lock_status", {
          resource_id: resourceId,
          resource_type: resourceType,
        });
      });
    },
    [connected, emit, socket]
  );

  const isLocked = useCallback(
    (resourceId: string, resourceType: string): boolean => {
      const lockKey = `${resourceType}:${resourceId}`;
      return lockKey in locks;
    },
    [locks]
  );

  const whoLocked = useCallback(
    (resourceId: string, resourceType: string): string | null => {
      const lockKey = `${resourceType}:${resourceId}`;
      return locks[lockKey] || null;
    },
    [locks]
  );

  return {
    socket,
    connected,
    error,
    locks,
    acquireLock,
    releaseLock,
    checkLockStatus,
    isLocked,
    whoLocked,
  };
};

// Export all hooks
export {
  useWebSocket as default,
  useCharacterSocket,
  useCombatSocket,
  useLockSocket,
};
