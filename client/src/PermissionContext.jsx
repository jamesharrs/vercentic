// client/src/PermissionContext.jsx
// React context that makes permissions available throughout the app.
// Wrap your App with <PermissionProvider userId={session.userId}>.

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadMyPermissions, clearPermCache } from './api';

const PermissionContext = createContext(null);

export function PermissionProvider({ userId, children }) {
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading]         = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) { setPermissions({ objects: {}, global: {} }); return; }
    setLoading(true);
    try {
      const p = await loadMyPermissions();
      setPermissions(p);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Sync helpers that read from cached state
  const check = useCallback((objectSlug, action) => {
    if (!permissions) return true; // optimistic before first load
    // Super admin and admin bypass all restrictions
    const slug = permissions._roleSlug;
    if (slug === 'super_admin' || slug === 'admin') return true;
    if (permissions.objects['*']?.[action]) return true;
    return Boolean(permissions.objects[objectSlug]?.[action]);
  }, [permissions]);

  const checkGlobal = useCallback((action) => {
    if (!permissions) return true;
    // Super admin and admin bypass all restrictions
    const slug = permissions._roleSlug;
    if (slug === 'super_admin' || slug === 'admin') return true;
    return Boolean(permissions.global?.[action]);
  }, [permissions]);

  return (
    <PermissionContext.Provider value={{ permissions, loading, refresh, can: check, canGlobal: checkGlobal }}>
      {children}
    </PermissionContext.Provider>
  );
}

/** Hook to consume permissions anywhere in the tree. */
const DEFAULT_PERMS = {
  permissions: null, loading: false,
  refresh: () => {},
  can: () => true,        // optimistic — no provider means no restriction
  canGlobal: () => true,
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
  const { can, canGlobal } = usePermissions();
  if (globalAction && !canGlobal(globalAction)) return fallback;
  if (object && action && !can(object, action)) return fallback;
  return children;
}
