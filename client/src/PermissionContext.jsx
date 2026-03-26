// client/src/PermissionContext.jsx
// React context that makes permissions available throughout the app.
// Wrap your App with <PermissionProvider userId={session.userId}>.

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadMyPermissions, clearPermCache } from './api';

const PermissionContext = createContext(null);

export function PermissionProvider({ userId, children }) {
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading]         = useState(true); // RBAC FIX: start true — restrictive until loaded

  const refresh = useCallback(async () => {
    if (!userId) { setPermissions({ objects: {}, global: {} }); setLoading(false); return; }
    setLoading(true);
    try {
      const p = await loadMyPermissions();
      setPermissions(p);
    } catch (err) {
      console.error('Failed to load permissions:', err);
      setPermissions({ objects: {}, global: {} }); // RBAC FIX: restrictive on failure
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Sync helpers that read from cached state
  const check = useCallback((objectSlug, action) => {
    if (!permissions || loading) return false; // RBAC FIX: restrictive until loaded
    // Only super_admin bypasses — admin is checked normally
    const slug = permissions._roleSlug;
    if (slug === 'super_admin') return true;
    if (permissions.objects['*']?.[action]) return true;
    return Boolean(permissions.objects[objectSlug]?.[action]);
  }, [permissions, loading]);

  const checkGlobal = useCallback((action) => {
    if (!permissions || loading) return false; // RBAC FIX: restrictive until loaded
    // Only super_admin bypasses — admin is checked normally
    const slug = permissions._roleSlug;
    if (slug === 'super_admin') return true;
    return Boolean(permissions.global?.[action]);
  }, [permissions, loading]);

  return (
    <PermissionContext.Provider value={{ permissions, loading, refresh, can: check, canGlobal: checkGlobal }}>
      {children}
    </PermissionContext.Provider>
  );
}

/** Hook to consume permissions anywhere in the tree. */
const DEFAULT_PERMS = {
  permissions: null, loading: true,
  refresh: () => {},
  can: () => false,        // RBAC FIX: restrictive — no provider means no access
  canGlobal: () => false,
};

export function usePermissions() {
  const ctx = useContext(PermissionContext);
  return ctx || DEFAULT_PERMS;  // safe fallback instead of throwing
}

/**
 * Gate — renders children only when the user has permission.
 *
 * Usage:
 *   <Gate object="people" action="create">
 *     <button>New Candidate</button>
 *   </Gate>
 *
 *   <Gate global="manage_users" fallback={<span>No access</span>}>
 *     <UsersSection />
 *   </Gate>
 */
export function Gate({ object, action, global: globalAction, fallback = null, children }) {
  const { can, canGlobal, loading } = usePermissions();
  if (loading) return fallback; // RBAC FIX: show fallback while loading
  if (globalAction && !canGlobal(globalAction)) return fallback;
  if (object && action && !can(object, action)) return fallback;
  return children;
}
