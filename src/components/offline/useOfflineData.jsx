import { useState, useEffect, useCallback } from "react";
import { useOffline } from "./OfflineManager";
import { base44 } from "@/api/base44Client";

export function useOfflineData(entityType, filterParams = {}) {
  const { isOnline, cacheEntityData, getCachedEntityData, createOffline, updateOffline } = useOffline();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const filterKey = JSON.stringify(filterParams);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const parsedFilter = JSON.parse(filterKey);

    try {
      if (isOnline) {
        const entityApi = base44.entities[entityType];
        const result = Object.keys(parsedFilter).length > 0
          ? await entityApi.filter(parsedFilter)
          : await entityApi.list();
        setData(result || []);
        await cacheEntityData(entityType, result || []);
      } else {
        const cached = await getCachedEntityData(entityType);
        if (cached && cached.length > 0) {
          const filtered = Object.keys(parsedFilter).length > 0
            ? cached.filter((item) => Object.entries(parsedFilter).every(([k, v]) => item[k] === v))
            : cached;
          setData(filtered);
        } else {
          setData([]);
        }
      }
    } catch (err) {
      try {
        const cached = await getCachedEntityData(entityType);
        if (cached && cached.length > 0) {
          setData(cached);
          setLoading(false);
          return;
        }
      } catch {}
      setError(err?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [entityType, isOnline, filterKey, cacheEntityData, getCachedEntityData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createRecord = async (recordData) => {
    if (isOnline) {
      const result = await base44.entities[entityType].create(recordData);
      await loadData();
      return result;
    }
    const result = await createOffline(entityType, recordData);
    await loadData();
    return result;
  };

  const updateRecord = async (id, recordData) => {
    if (isOnline) {
      const result = await base44.entities[entityType].update(id, recordData);
      await loadData();
      return result;
    }
    await updateOffline(entityType, id, recordData);
    await loadData();
  };

  return { data, loading, error, refetch: loadData, createRecord, updateRecord };
}
