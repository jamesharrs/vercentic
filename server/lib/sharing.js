// server/lib/sharing.js
// Centralised sharing helpers used across agents, workflows, reports, saved_views
//
// Share targets stored as:
//   sharing: {
//     visibility: 'private' | 'everyone' | 'specific',
//     user_ids: [],    // specific users
//     group_ids: [],   // specific groups
//   }

const { query } = require('../db/init');

function canAccess(item, userId) {
  if (!userId) return true;
  if (item.created_by === userId) return true;

  const sharing = item.sharing || {};
  const visibility = sharing.visibility || (item.is_shared ? 'everyone' : 'private');

  if (visibility === 'everyone') return true;
  if (visibility === 'private') return false;

  const userIds = sharing.user_ids || [];
  if (userIds.includes(userId)) return true;

  const groupIds = sharing.group_ids || [];
  if (groupIds.length > 0) {
    const groups = query('groups', g => groupIds.includes(g.id) && !g.deleted_at);
    for (const g of groups) {
      if ((g.member_ids || []).includes(userId)) return true;
    }
  }
  return false;
}

function filterByAccess(items, userId) {
  return items.filter(item => canAccess(item, userId));
}

function normaliseSharingPayload(body) {
  if (body.sharing) return body.sharing;
  if (body.is_shared !== undefined) {
    return { visibility: body.is_shared ? 'everyone' : 'private', user_ids: [], group_ids: [] };
  }
  return null;
}

function sharingLabel(sharing) {
  if (!sharing) return 'Private';
  switch (sharing.visibility) {
    case 'everyone': return 'Everyone';
    case 'specific': {
      const u = (sharing.user_ids || []).length;
      const g = (sharing.group_ids || []).length;
      const parts = [];
      if (u) parts.push(`${u} user${u > 1 ? 's' : ''}`);
      if (g) parts.push(`${g} group${g > 1 ? 's' : ''}`);
      return parts.length ? parts.join(', ') : 'Specific';
    }
    default: return 'Private';
  }
}

module.exports = { canAccess, filterByAccess, normaliseSharingPayload, sharingLabel };
