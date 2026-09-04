// client/src/PermissionContext.jsx
// React context that makes permissions available throughout the app.
// Wrap your App with <PermissionProvider userId={session.userId}>.

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { loadMyPermissions } from './apiClient.js';

const PermissionContext = createContext(null);

// Read session role from localStorage for fast-path bypass before permissions load
function getSessionRole() {
  try {
    const host = window.location.hostname;
    const parts = host.split('.');
    const reserved = ['www','app','api','admin','localhost','client','portal'];
    const isSubdomain = parts.length >= 3 && !reserved.includes(parts[0]) &&
      !['vercel','railway','up','netlify','localhost'].some(r => host.includes(r));
    const key = isSubdomain ? `vercentic_session_${parts[0]}` : 'vercentic_session_default';
    const sess = JSON.parse(localStorage.getItem(key) || 'null');
    return sess?.role?.slug || null;
  } catch { return null; }
}

export function PermissionProvider({ userId, children }) {
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading]         = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) { setPermissions({ objects: {}, global: {} }); setLoading(false); return; }
    setLoading(true);
    try {
      // Use apiClient (credentials:include + CSRF) so permissions load correctly
      // regardless of whether localStorage is populated yet.
      const data = await api.get('/auth/me');
      if (!data || data.error) {
        // Fallback to legacy loadMyPermissions (reads from localStorage)
        const p = await loadMyPermissions();
        setPermissions(p);
      } else {
        const perms = data.permissions || { objects: {}, global: {} };
        if (data.user?.role?.slug) perms._roleSlug = data.user.role.slug;
        setPermissions(perms);
      }
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
    // Fast-path: if session says super_admin, allow immediately even before async load
    if (getSessionRole() === 'super_admin') return true;
    if (!permissions || loading) return false;
    const slug = permissions._roleSlug;
    if (slug === 'super_admin') return true;
    if (permissions.objects['*']?.[action]) return true;
    return Boolean(permissions.objects[objectSlug]?.[action]);
  }, [permissions, loading]);

  // Nav-access flags that default to OPEN (true) when not explicitly configured.
  // This prevents locking out existing roles that predate a new flag being added.
  const NAV_ACCESS_DEFAULTS_OPEN = new Set([
    'access_sourcing','access_campaigns','access_chat','access_documents',
    'access_calendar','access_search','access_dashboard','access_org_chart',
    'access_interviews','access_offers','access_reports',
    // Record-level panels — default open so existing roles aren't locked out
    'record_view_comms','record_send_email','record_send_sms',
    'record_add_note','record_view_notes','record_delete_note',
    'record_view_files','record_upload_file','record_delete_file',
    'record_parse_cv','record_extract_doc',
  ]);

  const checkGlobal = useCallback((action) => {
    if (getSessionRole() === 'super_admin') return true;
    if (!permissions || loading) return false;
    // Only super_admin bypasses — admin is checked normally
    const slug = permissions._roleSlug;
    if (slug === 'super_admin') return true;
    const val = permissions.global?.[action];
    // If the flag is not set at all AND it's a nav-access flag → default to true
    if (val === undefined && NAV_ACCESS_DEFAULTS_OPEN.has(action)) return true;
    return Boolean(val);
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
