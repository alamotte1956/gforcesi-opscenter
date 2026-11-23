import React from "react";
import { usePermissions } from "./usePermissions";
import { ShieldAlert } from "lucide-react";

export function ProtectedPage({ requiredPermission, children }) {
  const { hasPermission, loading, user } = usePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-slate-800 border-t-[#4A9EFF] rounded-full animate-spin" />
      </div>
    );
  }

  const isAdmin = user?.role === "admin";
  const allowed =
    isAdmin ||
    !requiredPermission ||
    hasPermission(requiredPermission.category, requiredPermission.action);

  if (!allowed) {
    return (
      <div className="p-6 max-w-2xl mx-auto mt-12">
        <div className="rounded-2xl border border-rose-500/30 bg-slate-900 p-8 text-center">
          <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-100">Access Restricted</h2>
          <p className="text-sm text-slate-400 mt-1">
            Your current role does not include permission for{" "}
            <code className="text-rose-300">
              {requiredPermission.category}.{requiredPermission.action}
            </code>
            . Contact a G-Force SI Administrator to update your RBAC access level.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default ProtectedPage;
