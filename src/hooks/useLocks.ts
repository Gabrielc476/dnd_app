// hooks/useLocks.ts
import { useState, useEffect, useCallback } from "react";
import { useWebSocketWithLocks } from "@/lib/socket";
import { Lock } from "@/lib/types";

export interface UseLocksProps {
  campaignId: string;
  userId: string;
}

export interface UseLocksReturn {
  locks: Record<string, string>;
  connected: boolean;
  error: string | null;
  acquireLock: (
    resourceId: string,
    resourceType: string,
    duration?: number
  ) => Promise<boolean>;
  releaseLock: (resourceId: string, resourceType: string) => void;
  isLocked: (resourceId: string, resourceType: string) => boolean;
  isLockedByMe: (resourceId: string, resourceType: string) => boolean;
  isLockedByOther: (resourceId: string, resourceType: string) => boolean;
  whoLocked: (resourceId: string, resourceType: string) => string | null;
  checkLockStatus: (
    resourceId: string,
    resourceType: string
  ) => Promise<{ is_locked: boolean; locked_by?: string }>;
}

/**
 * Hook for managing distributed locks
 *
 * This hook provides a simple interface for acquiring, releasing and checking locks
 * using the WebSocket system.
 */
export function useLocks({
  campaignId,
  userId,
}: UseLocksProps): UseLocksReturn {
  const [lockMap, setLockMap] = useState<Record<string, string>>({});

  // Use the WebSocket with locks
  const {
    locks,
    connected,
    error,
    acquireLock: acquireLockSocket,
    releaseLock: releaseLockSocket,
    isLocked: isLockedSocket,
    whoLocked: whoLockedSocket,
    checkLockStatus: checkLockStatusSocket,
  } = useWebSocketWithLocks(campaignId, userId);

  // Keep local lock map in sync with WebSocket locks
  useEffect(() => {
    setLockMap(locks);
  }, [locks]);

  /**
   * Acquire a lock for a resource
   */
  const acquireLock = useCallback(
    async (
      resourceId: string,
      resourceType: string,
      duration?: number
    ): Promise<boolean> => {
      return acquireLockSocket(resourceId, resourceType, duration);
    },
    [acquireLockSocket]
  );

  /**
   * Release a lock for a resource
   */
  const releaseLock = useCallback(
    (resourceId: string, resourceType: string): void => {
      releaseLockSocket(resourceId, resourceType);
    },
    [releaseLockSocket]
  );

  /**
   * Check if a resource is locked by anyone
   */
  const isLocked = useCallback(
    (resourceId: string, resourceType: string): boolean => {
      const key = `${resourceType}:${resourceId}`;
      return lockMap[key] !== undefined;
    },
    [lockMap]
  );

  /**
   * Check if a resource is locked by the current user
   */
  const isLockedByMe = useCallback(
    (resourceId: string, resourceType: string): boolean => {
      const key = `${resourceType}:${resourceId}`;
      return lockMap[key] === userId;
    },
    [lockMap, userId]
  );

  /**
   * Check if a resource is locked by another user
   */
  const isLockedByOther = useCallback(
    (resourceId: string, resourceType: string): boolean => {
      return isLockedSocket(resourceId, resourceType);
    },
    [isLockedSocket]
  );

  /**
   * Get the ID of the user who has locked a resource
   */
  const whoLocked = useCallback(
    (resourceId: string, resourceType: string): string | null => {
      return whoLockedSocket(resourceId, resourceType);
    },
    [whoLockedSocket]
  );

  /**
   * Check the lock status of a resource
   */
  const checkLockStatus = useCallback(
    async (
      resourceId: string,
      resourceType: string
    ): Promise<{ is_locked: boolean; locked_by?: string }> => {
      return checkLockStatusSocket(resourceId, resourceType);
    },
    [checkLockStatusSocket]
  );

  return {
    locks: lockMap,
    connected,
    error,
    acquireLock,
    releaseLock,
    isLocked,
    isLockedByMe,
    isLockedByOther,
    whoLocked,
    checkLockStatus,
  };
}

export default useLocks;
