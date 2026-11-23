// Offline Storage Utility - Promise-wrapped IndexedDB engine for low-signal bank vaults & remote AK/HI sites

import { detectConflict } from "./ConflictResolver";

const DB_NAME = "gforcesi-unified-offline";
const DB_VERSION = 3;

const STORES = {
  PENDING_UPDATES: "pending-updates",
  CACHED_DATA: "cached-data",
  CACHED_JOBS: "cached-jobs",
  CACHED_EXPENSES: "cached-expenses",
  CACHED_SITES: "cached-sites",
  CACHED_PROJECTS: "cached-projects",
  CACHED_CONTRACTORS: "cached-contractors",
  CACHED_DELIVERABLES: "cached-deliverables",
  CONFLICTS: "sync-conflicts",
};

const reqToPromise = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const txDone = (tx) =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

export const openDB = () =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not supported in this browser"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      Object.values(STORES).forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          if (storeName === STORES.PENDING_UPDATES || storeName === STORES.CONFLICTS) {
            db.createObjectStore(storeName, { keyPath: "id", autoIncrement: true });
          } else {
            db.createObjectStore(storeName, { keyPath: "id" });
          }
        }
      });
    };
  });

function getStoreForEntity(entityType) {
  const mapping = {
    Job: STORES.CACHED_JOBS,
    Assignment: STORES.CACHED_JOBS,
    Expense: STORES.CACHED_EXPENSES,
    ContractorExpense: STORES.CACHED_EXPENSES,
    Site: STORES.CACHED_SITES,
    Project: STORES.CACHED_PROJECTS,
    Contractor: STORES.CACHED_CONTRACTORS,
    Personnel: STORES.CACHED_CONTRACTORS,
    Deliverable: STORES.CACHED_DELIVERABLES,
  };
  return mapping[entityType] || STORES.CACHED_DATA;
}

export const cacheEntityData = async (entityType, data) => {
  const db = await openDB();
  const storeName = getStoreForEntity(entityType);
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);

  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && item.id) store.put(item);
    }
  } else if (data && data.id) {
    store.put(data);
  }
  await txDone(tx);
};

export const getCachedEntityData = async (entityType, id = null) => {
  const db = await openDB();
  const storeName = getStoreForEntity(entityType);
  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);
  return id ? await reqToPromise(store.get(id)) : await reqToPromise(store.getAll());
};

export const clearCachedEntityData = async (entityType) => {
  const db = await openDB();
  const storeName = getStoreForEntity(entityType);
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).clear();
  await txDone(tx);
};

export const queueOperation = async (operation) => {
  const db = await openDB();
  const tx = db.transaction(STORES.PENDING_UPDATES, "readwrite");
  const op = {
    ...operation,
    timestamp: Date.now(),
    status: "pending",
  };
  const id = await reqToPromise(tx.objectStore(STORES.PENDING_UPDATES).add(op));
  await txDone(tx);
  return id;
};

export const getPendingOperations = async () => {
  const db = await openDB();
  const tx = db.transaction(STORES.PENDING_UPDATES, "readonly");
  return await reqToPromise(tx.objectStore(STORES.PENDING_UPDATES).getAll());
};

export const removeOperation = async (id) => {
  const db = await openDB();
  const tx = db.transaction(STORES.PENDING_UPDATES, "readwrite");
  tx.objectStore(STORES.PENDING_UPDATES).delete(id);
  await txDone(tx);
};

export const updateOperationStatus = async (id, status, error = null) => {
  const db = await openDB();
  const tx = db.transaction(STORES.PENDING_UPDATES, "readwrite");
  const store = tx.objectStore(STORES.PENDING_UPDATES);
  const operation = await reqToPromise(store.get(id));
  if (operation) {
    operation.status = status;
    operation.error = error;
    operation.lastAttempt = Date.now();
    store.put(operation);
  }
  await txDone(tx);
};

export const clearPendingOperations = async () => {
  const db = await openDB();
  const tx = db.transaction(STORES.PENDING_UPDATES, "readwrite");
  tx.objectStore(STORES.PENDING_UPDATES).clear();
  await txDone(tx);
};

async function storeConflict(conflict, resolution) {
  const db = await openDB();
  if (!db.objectStoreNames.contains(STORES.CONFLICTS)) return;
  const tx = db.transaction(STORES.CONFLICTS, "readwrite");
  tx.objectStore(STORES.CONFLICTS).add({
    ...conflict,
    resolution,
    detectedAt: Date.now(),
    status: "unresolved",
  });
  await txDone(tx);
}

export const getStoredConflicts = async () => {
  const db = await openDB();
  if (!db.objectStoreNames.contains(STORES.CONFLICTS)) return [];
  const tx = db.transaction(STORES.CONFLICTS, "readonly");
  const allConflicts = await reqToPromise(tx.objectStore(STORES.CONFLICTS).getAll());
  return allConflicts.filter((c) => c.status === "unresolved");
};

export const resolveStoredConflict = async (conflictId, resolution) => {
  const db = await openDB();
  const tx = db.transaction(STORES.CONFLICTS, "readwrite");
  const store = tx.objectStore(STORES.CONFLICTS);
  const conflict = await reqToPromise(store.get(conflictId));
  if (conflict) {
    conflict.status = "resolved";
    conflict.resolution = resolution;
    conflict.resolvedAt = Date.now();
    store.put(conflict);
  }
  await txDone(tx);
};

async function updateLocalId(entityType, tempId, serverId) {
  const storeName = getStoreForEntity(entityType);
  const db = await openDB();
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  const item = await reqToPromise(store.get(tempId));
  if (item) {
    store.delete(tempId);
    item.id = serverId;
    item._synced = true;
    store.put(item);
  }
  await txDone(tx);
}

export const syncOperations = async (base44Client) => {
  const operations = await getPendingOperations();
  const results = { success: 0, failed: 0, conflicts: 0, errors: [] };
  const sortedOps = [...operations].sort((a, b) => a.timestamp - b.timestamp);

  for (const operation of sortedOps) {
    try {
      const entityApi = base44Client.entities?.[operation.entityType];
      if (!entityApi) {
        await removeOperation(operation.id);
        continue;
      }

      if (operation.method === "CREATE") {
        const created = await entityApi.create(operation.data);
        if (created?.id && operation.tempId) {
          await updateLocalId(operation.entityType, operation.tempId, created.id);
        }
      } else if (operation.method === "UPDATE") {
        const serverData = await entityApi.get(operation.entityId).catch(() => null);
        const localData = { ...operation.data, id: operation.entityId, _localUpdatedAt: operation.timestamp };
        const conflict = serverData ? detectConflict(localData, serverData) : null;

        if (conflict) {
          await storeConflict({ ...conflict, entityType: operation.entityType, operationId: operation.id }, { strategy: "manual_review" });
          results.conflicts++;
          await updateOperationStatus(operation.id, "conflict", "Data conflict detected — manual review required");
          continue;
        }
        await entityApi.update(operation.entityId, operation.data);
      } else if (operation.method === "DELETE") {
        await entityApi.delete(operation.entityId);
      }

      await removeOperation(operation.id);
      results.success++;
    } catch (error) {
      const msg = error?.message || "Sync failed";
      const isNetworkError = /fetch|network|timeout|offline/i.test(msg);
      if (isNetworkError) {
        await updateOperationStatus(operation.id, "error", msg);
      } else {
        await removeOperation(operation.id);
      }
      results.failed++;
      results.errors.push({ operation: operation.id, error: msg });
    }
  }

  return results;
};

export const preCacheForOffline = async (base44Client, contractorId) => {
  try {
    const [allJobs, allSites, allProjects, allExpenses] = await Promise.all([
      base44Client.entities.Job.list().catch(() => []),
      base44Client.entities.Site.list().catch(() => []),
      base44Client.entities.Project.list().catch(() => []),
      base44Client.entities.Expense.list().catch(() => []),
    ]);

    const myJobs = contractorId
      ? allJobs.filter((j) => (j.assigned_contractor_ids || []).includes(contractorId))
      : allJobs;
    const siteIds = new Set(myJobs.map((j) => j.site_id).filter(Boolean));
    const projectIds = new Set(myJobs.map((j) => j.project_id).filter(Boolean));

    await Promise.all([
      cacheEntityData("Job", myJobs),
      cacheEntityData("Site", siteIds.size ? allSites.filter((s) => siteIds.has(s.id)) : allSites),
      cacheEntityData("Project", projectIds.size ? allProjects.filter((p) => projectIds.has(p.id)) : allProjects),
      cacheEntityData("Expense", allExpenses),
    ]);
    return true;
  } catch (error) {
    console.error("[Offline] Pre-cache failed:", error);
    return false;
  }
};

export default {
  openDB,
  cacheEntityData,
  getCachedEntityData,
  clearCachedEntityData,
  queueOperation,
  getPendingOperations,
  removeOperation,
  syncOperations,
  preCacheForOffline,
  getStoredConflicts,
  resolveStoredConflict,
};
