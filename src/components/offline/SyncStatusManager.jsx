const PENDING_OPS_KEY = "gforcesi_pending_operations";

export const SyncStatus = {
  PENDING: "pending",
  SYNCING: "syncing",
  SYNCED: "synced",
  FAILED: "failed",
  CONFLICT: "conflict",
};

export const getPendingOperations = () => {
  try {
    const stored = localStorage.getItem(PENDING_OPS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const addPendingOperation = (operation) => {
  const pending = getPendingOperations();
  const op = {
    ...operation,
    id: operation.id || `op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    status: SyncStatus.PENDING,
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  };
  pending.push(op);
  try { localStorage.setItem(PENDING_OPS_KEY, JSON.stringify(pending)); } catch {}
  return op;
};

export const updateOperationStatus = (operationId, status, error = null) => {
  const pending = getPendingOperations();
  const op = pending.find((item) => item.id === operationId);
  if (op) {
    op.status = status;
    op.lastError = error;
    op.lastAttempt = new Date().toISOString();
    op.attempts = (op.attempts || 0) + 1;
    try { localStorage.setItem(PENDING_OPS_KEY, JSON.stringify(pending)); } catch {}
  }
};

export const removePendingOperation = (operationId) => {
  const filtered = getPendingOperations().filter((item) => item.id !== operationId);
  try { localStorage.setItem(PENDING_OPS_KEY, JSON.stringify(filtered)); } catch {}
};

export const getFailedOperations = () => getPendingOperations().filter((op) => op.status === SyncStatus.FAILED);

export const getPendingSyncCount = () =>
  getPendingOperations().filter((op) => op.status === SyncStatus.PENDING || op.status === SyncStatus.SYNCING).length;

export const getFailedSyncCount = () => getFailedOperations().length;

export const clearAllPending = () => {
  try { localStorage.removeItem(PENDING_OPS_KEY); } catch {}
};
