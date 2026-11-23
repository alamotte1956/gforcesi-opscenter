import { useState, useEffect, useCallback } from "react";
import { getUserPermissions, clearPermissionCache } from "./PermissionChecker";
import { base44 } from "@/api/base44Client";
import { levelForUser, roleBadgeForUser } from "@/lib/accessLevels";

export function usePermissions() {
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const loadPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      const userPermissions = await getUserPermissions(currentUser);
      setPermissions(userPermissions);
    } catch {
      setPermissions(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const hasPermission = (category, action) => Boolean(permissions?.[category]?.[action] === true);
  const hasAnyPermission = (category, actions) =>
    Boolean(permissions && actions.some((a) => permissions[category]?.[a] === true));
  const hasAllPermissions = (category, actions) =>
    Boolean(permissions && actions.every((a) => permissions[category]?.[a] === true));

  const refreshPermissions = async () => {
    clearPermissionCache();
    await loadPermissions();
  };

  return {
    permissions,
    loading,
    user,
    accessLevel: levelForUser(user),
    roleBadge: roleBadgeForUser(user),
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions,
  };
}
