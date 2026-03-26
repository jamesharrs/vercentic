/**
 * usePermissions — reads the current session from localStorage,
 * exposes a can(objectSlug, action) helper and the full user object.
 *
 * Super Admin bypass: super_admin role always returns true.
 */

const SESSION_KEY = "talentos_session";

export function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
  catch { return null; }
}

export function setSession(data) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export default function usePermissions() {
  const session = getSession();
  const user = session?.user || null;
  const role = session?.role || null;
  const permissions = session?.permissions || [];

  const isSuperAdmin = role?.slug === "super_admin";

  /**
   * can("people", "edit")  → boolean
   * Super admin always true. No session → false.
   */
  const can = (objectSlug, action) => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    return permissions.some(
      p => p.object_slug === objectSlug && p.action === action && p.allowed
    );
  };

  /** True if user has ANY permission on this object */
  const canAccessObject = (objectSlug) => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    return permissions.some(p => p.object_slug === objectSlug && p.allowed);
  };

  return { user, role, permissions, can, canAccessObject, isSuperAdmin, isLoggedIn: !!user };
}
