import React, { useState, useEffect, useCallback, createContext, useContext } from "react";
import { WifiOff, CloudOff, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  queueOperation,
  getPendingOperations,
  syncOperations,
  cacheEntityData,
  getCachedEntityData,
  getStoredConflicts,
  preCacheForOffline,
} from "./OfflineStorage";
import ConflictResolutionDialog from "./ConflictResolutionDialog";
import { base44 } from "@/api/base44Client";

const OfflineContext = createContext(null);

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error("useOffline must be used within OfflineProvider");
  }
  return context;
};

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [activeConflict, setActiveConflict] = useState(null);

  const checkPendingChanges = useCallback(async () => {
    try {
      const [operations, storedConflicts] = await Promise.all([
        getPendingOperations(),
        getStoredConflicts(),
      ]);
      setPendingChanges(operations.length);
      setConflicts(storedConflicts);
    } catch {
      // IndexedDB unavailable in private browsing or restricted iframe
    }
  }, []);

  const performSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatus("syncing");
    try {
      const results = await syncOperations(base44);
      const storedConflicts = await getStoredConflicts();
      setConflicts(storedConflicts);
      if (results.conflicts > 0) {
        setSyncStatus("conflicts");
      } else if (results.failed === 0) {
        setSyncStatus("success");
        setTimeout(() => setSyncStatus(null), 3000);
      } else {
        setSyncStatus("partial");
        setTimeout(() => setSyncStatus(null), 5000);
      }
      await checkPendingChanges();
    } catch {
      setSyncStatus("error");
      setTimeout(() => setSyncStatus(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, checkPendingChanges]);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      await performSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus(null);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    checkPendingChanges();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [performSync, checkPendingChanges]);

  const createOffline = async (entityType, data) => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const record = { ...data, id: tempId, _offline: true };
    await cacheEntityData(entityType, record);
    await queueOperation({ method: "CREATE", entityType, data, tempId });
    await checkPendingChanges();
    return record;
  };

  const updateOffline = async (entityType, entityId, data) => {
    await cacheEntityData(entityType, { id: entityId, ...data });
    await queueOperation({ method: "UPDATE", entityType, entityId, data });
    await checkPendingChanges();
  };

  const deleteOffline = async (entityType, entityId) => {
    await queueOperation({ method: "DELETE", entityType, entityId });
    await checkPendingChanges();
  };

  const preCacheFieldData = async (contractorId) => preCacheForOffline(base44, contractorId);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingChanges,
        isSyncing,
        syncStatus,
        conflicts,
        createOffline,
        updateOffline,
        deleteOffline,
        performSync,
        checkPendingChanges,
        cacheEntityData,
        getCachedEntityData,
        preCacheFieldData,
      }}
    >
      {children}
      <OfflineIndicator
        isOnline={isOnline}
        pendingChanges={pendingChanges}
        isSyncing={isSyncing}
        syncStatus={syncStatus}
        conflicts={conflicts}
        onOpenConflict={() => conflicts[0] && setActiveConflict(conflicts[0])}
      />
      <ConflictResolutionDialog
        conflict={activeConflict}
        isOpen={Boolean(activeConflict)}
        onResolve={async () => {
          setActiveConflict(null);
          await checkPendingChanges();
        }}
      />
    </OfflineContext.Provider>
  );
}

function OfflineIndicator({ isOnline, pendingChanges, isSyncing, syncStatus, conflicts = [], onOpenConflict }) {
  if (isOnline && pendingChanges === 0 && !syncStatus && conflicts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm space-y-2">
      {!isOnline && (
        <div className="rounded-xl border border-amber-500/40 bg-[#0A1628] text-amber-200 px-4 py-3 shadow-2xl flex items-start gap-2.5 text-xs">
          <WifiOff className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-100">Offline Vault / Remote Mode</div>
            <div className="text-amber-200/80 mt-0.5">
              Changes cached in IndexedDB and auto-synced upon reconnect.
              {pendingChanges > 0 && ` (${pendingChanges} queued)`}
            </div>
          </div>
        </div>
      )}

      {isOnline && isSyncing && (
        <div className="rounded-xl border border-[#126DFA]/50 bg-[#0A1628] text-slate-100 px-4 py-3 shadow-2xl flex items-center gap-2.5 text-xs">
          <CloudOff className="h-4 w-4 text-[#4A9EFF] animate-pulse shrink-0" />
          <span>Syncing {pendingChanges} offline change(s) to Ops Center…</span>
        </div>
      )}

      {syncStatus === "success" && (
        <div className="rounded-xl border border-emerald-500/40 bg-[#0A1628] text-emerald-200 px-4 py-3 shadow-2xl flex items-center gap-2.5 text-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>All offline field changes synced.</span>
        </div>
      )}

      {conflicts.length > 0 && (
        <button
          type="button"
          onClick={onOpenConflict}
          className="w-full text-left rounded-xl border border-amber-500/50 bg-[#0A1628] text-amber-200 px-4 py-3 shadow-2xl flex items-start gap-2.5 text-xs hover:bg-slate-900"
        >
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">{conflicts.length} Sync Conflict(s) Need Review</div>
            <div className="text-amber-300/80">Click to resolve conflicts</div>
          </div>
        </button>
      )}
    </div>
  );
}
