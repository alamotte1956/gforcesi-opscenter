import { useEffect, useState, useCallback, useRef } from "react";

const KEY = "gforce_offline_queue";

// Tracks connectivity and persists operations to localStorage so the
// Field App can keep working without a connection and sync when reconnected.
export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [queue, setQueue] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
  });
  const flushingRef = useRef(false);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const persist = (q) => {
    try { localStorage.setItem(KEY, JSON.stringify(q)); } catch (e) {
      // Quota exceeded (e.g. large photo data URLs) — drop oldest until it fits.
      while (q.length > 1) {
        q = q.slice(1);
        try { localStorage.setItem(KEY, JSON.stringify(q)); break; } catch {}
      }
    }
  };

  const enqueue = useCallback((op) => {
    setQueue((q) => {
      const id = op.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
      const nq = [...q, { ...op, id, queuedAt: Date.now() }];
      persist(nq);
      return nq;
    });
  }, []);

  const remove = useCallback((id) => {
    setQueue((q) => {
      const nq = q.filter((o) => o.id !== id);
      persist(nq);
      return nq;
    });
  }, []);

  // Run every queued op through `runner(op)`; on failure the op stays queued.
  const flush = useCallback(async (runner) => {
    if (flushingRef.current) return;
    let q;
    try { q = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { q = []; }
    if (!q.length) return;
    flushingRef.current = true;
    for (const op of q) {
      try {
        await runner(op);
        setQueue((cur) => {
          const nq = cur.filter((o) => o.id !== op.id);
          persist(nq);
          return nq;
        });
      } catch (e) {
        // leave it in the queue to retry next time
      }
    }
    flushingRef.current = false;
  }, []);

  return { isOnline, queue, enqueue, flush };
}