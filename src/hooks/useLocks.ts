/**
 * useLocks Hook - COMPLETAMENTE REFATORADO
 * Problemas resolvidos:
 * 1. ✅ Todas as funções completadas (estavam cortadas)
 * 2. ✅ Proper WebSocket integration
 * 3. ✅ Lock state management
 * 4. ✅ Error handling adequado
 * 5. ✅ TypeScript types completos
 */

import { useState, useEffect, useCallback } from "react";
import { useLockSocket } from "@/lib/socket";
import { LockEvent } from "@/lib/types";
import { toast } from "sonner";

// ===== TYPES =====
export interface UseLocksProps {
  campaignId: string;
  userId: string;
}

export interface UseLocksReturn {
  // Lock state
  locks: Record<string, string>; // resourceKey -> userId
  connected: boolean;
  error: string | null;

  // Lock operations
  acquireLock: (
    resourceId: string,
    resourceType: string,
    duration?: number
  ) => Promise<boolean>;
  releaseLock: (resourceId: string, resourceType: string) => void;
  checkLockStatus: (
    resourceId: string,
    resourceType: string
  ) => Promise<{ is_locked: boolean; locked_by?: string }>;

  // Lock queries
  isLocked: (resourceId: string, resourceType: string) => boolean;
  isLockedByMe: (resourceId: string, resourceType: string) => boolean;
  isLockedByOther: (resourceId: string, resourceType: string) => boolean;
  whoLocked: (resourceId: string, resourceType: string) => string | null;

  // Lock management
  releaseAllLocks: () => void;
  getLocksByType: (resourceType: string) => Record<string, string>;
  getLocksByUser: (userId: string) => Record<string, string>;

  // Utility
  getLockKey: (resourceId: string, resourceType: string) => string;
  parseLockKey: (
    lockKey: string
  ) => { resourceId: string; resourceType: string } | null;
}

// ===== LOCK TYPES =====
export const LOCK_TYPES = {
  CHARACTER: "character",
  NPC: "npc",
  COMBAT: "combat",
  ENCOUNTER: "encounter",
  CAMPAIGN: "campaign",
  ITEM: "item",
  SPELL: "spell",
} as const;

export type LockType = (typeof LOCK_TYPES)[keyof typeof LOCK_TYPES];

// ===== UTILITY FUNCTIONS =====
const createLockKey = (resourceId: string, resourceType: string): string => {
  return `${resourceType}:${resourceId}`;
};

const parseLockKey = (
  lockKey: string
): { resourceId: string; resourceType: string } | null => {
  const parts = lockKey.split(":");
  if (parts.length !== 2) return null;

  return {
    resourceType: parts[0],
    resourceId: parts[1],
  };
};

// ===== HOOK IMPLEMENTATION =====
export function useLocks({
  campaignId,
  userId,
}: UseLocksProps): UseLocksReturn {
  // Local state for additional lock tracking
  const [lockMap, setLockMap] = useState<Record<string, string>>({});
  const [pendingLocks, setPendingLocks] = useState<Set<string>>(new Set());

  // WebSocket integration
  const {
    connected,
    error,
    locks: socketLocks,
    acquireLock: socketAcquireLock,
    releaseLock: socketReleaseLock,
    checkLockStatus: socketCheckLockStatus,
    isLocked: socketIsLocked,
    whoLocked: socketWhoLocked,
  } = useLockSocket(campaignId, userId);

  // Sync socket locks with local state
  useEffect(() => {
    setLockMap(socketLocks);
  }, [socketLocks]);

  // ===== LOCK OPERATIONS =====
  const acquireLock = useCallback(
    async (
      resourceId: string,
      resourceType: string,
      duration: number = 300
    ): Promise<boolean> => {
      const lockKey = createLockKey(resourceId, resourceType);

      // Check if already locked by someone else
      if (isLockedByOther(resourceId, resourceType)) {
        const lockedBy = whoLocked(resourceId, resourceType);
        toast.error(`Resource is locked by ${lockedBy || "another user"}`);
        return false;
      }

      // Check if already locked by current user
      if (isLockedByMe(resourceId, resourceType)) {
        // Already locked by us, consider it successful
        return true;
      }

      try {
        // Add to pending locks
        setPendingLocks((prev) => new Set(prev).add(lockKey));

        const success = await socketAcquireLock(
          resourceId,
          resourceType,
          duration
        );

        // Remove from pending locks
        setPendingLocks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(lockKey);
          return newSet;
        });

        if (success) {
          toast.success(`Acquired lock on ${resourceType}`);
          return true;
        } else {
          toast.error(`Failed to acquire lock on ${resourceType}`);
          return false;
        }
      } catch (error) {
        // Remove from pending locks
        setPendingLocks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(lockKey);
          return newSet;
        });

        console.error("Error acquiring lock:", error);
        toast.error(`Error acquiring lock: ${error.message}`);
        return false;
      }
    },
    [socketAcquireLock, isLockedByOther, isLockedByMe, whoLocked]
  );

  const releaseLock = useCallback(
    (resourceId: string, resourceType: string): void => {
      const lockKey = createLockKey(resourceId, resourceType);

      // Check if we own the lock
      if (!isLockedByMe(resourceId, resourceType)) {
        toast.warning("Cannot release lock - not owned by you");
        return;
      }

      try {
        socketReleaseLock(resourceId, resourceType);
        toast.success(`Released lock on ${resourceType}`);
      } catch (error) {
        console.error("Error releasing lock:", error);
        toast.error(`Error releasing lock: ${error.message}`);
      }
    },
    [socketReleaseLock, isLockedByMe]
  );

  const checkLockStatus = useCallback(
    async (
      resourceId: string,
      resourceType: string
    ): Promise<{ is_locked: boolean; locked_by?: string }> => {
      try {
        return await socketCheckLockStatus(resourceId, resourceType);
      } catch (error) {
        console.error("Error checking lock status:", error);
        return { is_locked: false };
      }
    },
    [socketCheckLockStatus]
  );

  // ===== LOCK QUERIES =====
  const isLocked = useCallback(
    (resourceId: string, resourceType: string): boolean => {
      const lockKey = createLockKey(resourceId, resourceType);
      return lockKey in lockMap || pendingLocks.has(lockKey);
    },
    [lockMap, pendingLocks]
  );

  const isLockedByMe = useCallback(
    (resourceId: string, resourceType: string): boolean => {
      const lockKey = createLockKey(resourceId, resourceType);
      return lockMap[lockKey] === userId;
    },
    [lockMap, userId]
  );

  const isLockedByOther = useCallback(
    (resourceId: string, resourceType: string): boolean => {
      const lockKey = createLockKey(resourceId, resourceType);
      const lockOwner = lockMap[lockKey];
      return lockOwner !== undefined && lockOwner !== userId;
    },
    [lockMap, userId]
  );

  const whoLocked = useCallback(
    (resourceId: string, resourceType: string): string | null => {
      const lockKey = createLockKey(resourceId, resourceType);
      return lockMap[lockKey] || null;
    },
    [lockMap]
  );

  // ===== LOCK MANAGEMENT =====
  const releaseAllLocks = useCallback(() => {
    // Release all locks owned by current user
    Object.entries(lockMap).forEach(([lockKey, lockOwner]) => {
      if (lockOwner === userId) {
        const parsed = parseLockKey(lockKey);
        if (parsed) {
          releaseLock(parsed.resourceId, parsed.resourceType);
        }
      }
    });
  }, [lockMap, userId, releaseLock]);

  const getLocksByType = useCallback(
    (resourceType: string): Record<string, string> => {
      const result: Record<string, string> = {};

      Object.entries(lockMap).forEach(([lockKey, lockOwner]) => {
        const parsed = parseLockKey(lockKey);
        if (parsed && parsed.resourceType === resourceType) {
          result[parsed.resourceId] = lockOwner;
        }
      });

      return result;
    },
    [lockMap]
  );

  const getLocksByUser = useCallback(
    (targetUserId: string): Record<string, string> => {
      const result: Record<string, string> = {};

      Object.entries(lockMap).forEach(([lockKey, lockOwner]) => {
        if (lockOwner === targetUserId) {
          const parsed = parseLockKey(lockKey);
          if (parsed) {
            result[lockKey] = parsed.resourceType;
          }
        }
      });

      return result;
    },
    [lockMap]
  );

  // ===== UTILITY =====
  const getLockKey = useCallback(createLockKey, []);

  // Clean up locks on unmount
  useEffect(() => {
    return () => {
      // Release all locks when component unmounts
      releaseAllLocks();
    };
  }, [releaseAllLocks]);

  // Auto-release locks on page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, consider releasing locks
        // This could be configurable behavior
        console.log("Page hidden - keeping locks for now");
      } else {
        // Page is visible again
        console.log("Page visible - locks maintained");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Auto-release locks on beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Try to release locks before page unload
      releaseAllLocks();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [releaseAllLocks]);

  return {
    // Lock state
    locks: lockMap,
    connected,
    error,

    // Lock operations
    acquireLock,
    releaseLock,
    checkLockStatus,

    // Lock queries
    isLocked,
    isLockedByMe,
    isLockedByOther,
    whoLocked,

    // Lock management
    releaseAllLocks,
    getLocksByType,
    getLocksByUser,

    // Utility
    getLockKey,
    parseLockKey,
  };
}

// ===== HIGHER-ORDER HOOKS =====

/**
 * Hook for managing locks on a specific resource
 */
export function useResourceLock(
  campaignId: string,
  userId: string,
  resourceId: string,
  resourceType: string,
  autoAcquire: boolean = false
) {
  const locks = useLocks({ campaignId, userId });

  const isLocked = locks.isLocked(resourceId, resourceType);
  const isLockedByMe = locks.isLockedByMe(resourceId, resourceType);
  const isLockedByOther = locks.isLockedByOther(resourceId, resourceType);
  const lockedBy = locks.whoLocked(resourceId, resourceType);

  const acquireLock = useCallback(
    (duration?: number) =>
      locks.acquireLock(resourceId, resourceType, duration),
    [locks, resourceId, resourceType]
  );

  const releaseLock = useCallback(
    () => locks.releaseLock(resourceId, resourceType),
    [locks, resourceId, resourceType]
  );

  // Auto-acquire lock if requested
  useEffect(() => {
    if (autoAcquire && !isLocked) {
      acquireLock();
    }
  }, [autoAcquire, isLocked, acquireLock]);

  return {
    ...locks,
    isLocked,
    isLockedByMe,
    isLockedByOther,
    lockedBy,
    acquireLock,
    releaseLock,
  };
}

/**
 * Hook for character-specific locks
 */
export function useCharacterLock(
  campaignId: string,
  userId: string,
  characterId: string,
  autoAcquire: boolean = false
) {
  return useResourceLock(
    campaignId,
    userId,
    characterId,
    LOCK_TYPES.CHARACTER,
    autoAcquire
  );
}

/**
 * Hook for NPC-specific locks
 */
export function useNPCLock(
  campaignId: string,
  userId: string,
  npcId: string,
  autoAcquire: boolean = false
) {
  return useResourceLock(
    campaignId,
    userId,
    npcId,
    LOCK_TYPES.NPC,
    autoAcquire
  );
}

/**
 * Hook for combat-specific locks
 */
export function useCombatLock(
  campaignId: string,
  userId: string,
  combatId: string,
  autoAcquire: boolean = false
) {
  return useResourceLock(
    campaignId,
    userId,
    combatId,
    LOCK_TYPES.COMBAT,
    autoAcquire
  );
}

export default useLocks;
