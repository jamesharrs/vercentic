'use strict';
const { getEnabledKeys } = require('../routes/feature_packs');

/**
 * requireFeature(key)
 * Express middleware — returns 403 if the feature pack is not enabled.
 * Usage: router.get('/endpoint', requireFeature('live_chat'), handler);
 */
function requireFeature(key) {
  return (req, res, next) => {
    const environmentId =
      req.query.environment_id ||
      req.body?.environment_id ||
      req.headers['x-environment-id'];

    if (!environmentId) return next(); // no env context — let through

    try {
      const enabled = getEnabledKeys(environmentId);
      if (!enabled.has(key)) {
        return res.status(403).json({
          error: 'Feature not enabled',
          code: 'FEATURE_DISABLED',
          feature: key,
        });
      }
    } catch (err) {
      console.error('[feature-gate] Error checking feature:', err.message);
    }
    next();
  };
}

module.exports = { requireFeature };
