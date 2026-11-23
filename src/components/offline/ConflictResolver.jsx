// Conflict resolution strategies for offline-first Field PWA data

export const CONFLICT_STRATEGIES = {
  SERVER_WINS: "server_wins",
  LOCAL_WINS: "local_wins",
  MERGE_FIELDS: "merge_fields",
  MANUAL_REVIEW: "manual_review",
};

export const detectConflict = (localData, serverData) => {
  if (!localData || !serverData) return null;

  const localTimestamp = localData.updated_date || localData.created_date || localData._localUpdatedAt;
  const serverTimestamp = serverData.updated_date || serverData.created_date;

  if (!serverTimestamp) return null;
  if (localTimestamp && new Date(serverTimestamp).getTime() <= new Date(localTimestamp).getTime()) {
    return null;
  }

  const fields = [];
  Object.keys(localData).forEach((key) => {
    if (key.startsWith("_") || ["id", "created_date", "updated_date", "created_by", "created_by_id"].includes(key)) {
      return;
    }
    if (JSON.stringify(localData[key]) !== JSON.stringify(serverData[key])) {
      fields.push({
        name: key,
        local: localData[key],
        server: serverData[key],
      });
    }
  });

  if (fields.length === 0) return null;

  return {
    entityId: localData.id,
    type: fields.length === 1 ? "field_conflict" : "multi_field_conflict",
    fields,
    timestamp: {
      local: localTimestamp || new Date().toISOString(),
      server: serverTimestamp,
    },
  };
};

const mergeNonConflictingFields = (conflict) => {
  const merged = {};
  conflict.fields.forEach((field) => {
    if (typeof field.local === "string" && typeof field.server === "string") {
      merged[field.name] = `${field.server}\n[Offline Field Note: ${field.local}]`;
    } else {
      merged[field.name] = field.server;
    }
  });
  return merged;
};

export const resolveConflict = (conflict, strategy = CONFLICT_STRATEGIES.SERVER_WINS) => {
  if (!conflict) return null;

  switch (strategy) {
    case CONFLICT_STRATEGIES.SERVER_WINS:
      return { strategy, resolved: true, action: "discard_local" };
    case CONFLICT_STRATEGIES.LOCAL_WINS:
      return { strategy, resolved: true, action: "keep_local" };
    case CONFLICT_STRATEGIES.MERGE_FIELDS:
      return {
        strategy,
        resolved: true,
        action: "merge",
        mergedData: mergeNonConflictingFields(conflict),
      };
    case CONFLICT_STRATEGIES.MANUAL_REVIEW:
      return { strategy, resolved: false, action: "manual_review" };
    default:
      return { strategy: CONFLICT_STRATEGIES.SERVER_WINS, resolved: true, action: "discard_local" };
  }
};
