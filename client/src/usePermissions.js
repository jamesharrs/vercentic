/**
 * usePermissions — reads the current session from localStorage,
 * exposes a can(objectSlug, action) helper and the full user object.
 *
 * Super Admin bypass: super_admin role always returns true.
 */

const SESSION_KEY = "talentos_session";

// Scope session key to subdomain so each tenant environment is isolated
function _sessionKey() {
  try {
    const host = window.location.hostname;
    const parts = host.split('.');
    const reserved = ['www','app','api','admin','localhost','client','portal'];
    const isSubdomain = parts.length >= 3 && !reserved.includes(parts[0]) &&
      !['vercel','railway','up','netlify','localhost'].some(r => host.includes(r));
    return isSubdomain ? `${SESSION_KEY}_${parts[0]}` : `${SESSION_KEY}_default`;
  } catch { return `${SESSION_KEY}_default`; }
}

export function getSession() {
  try { return JSON.parse(localStorage.getItem(_sessionKey()) || "null"); }
  catch { return null; }
}

export function setSession(data) {
  localStorage.setItem(_sessionKey(), JSON.stringify(data));
}

export function clearSession() {
  localStorage.removeItem(_sessionKey());
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
