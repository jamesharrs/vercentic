// server/middleware/validate.js
// Thin Zod wrapper — turns schema failures into consistent 400 responses.
//
// Usage:
//   const { validate, wrap } = require('../middleware/validate');
//   const { loginSchema }    = require('../validation/schemas');
//   router.post('/login', validate(loginSchema), (req, res) => { ... });
//
// req.body is replaced with the parsed+coerced output (unknown keys stripped).
// wrap() catches async throws and forwards to Express error handler.

'use strict';
const { z } = require('zod');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field:   e.path.length ? e.path.join('.') : source,
        message: e.message,
        code:    e.code,
      }));
      return res.status(400).json({
        error:  'Validation failed',
        errors,
        detail: errors[0]?.message ?? 'Invalid input',
      });
    }
    req[source] = result.data; // stripped + coerced
    next();
  };
}

function wrap(fn) {
  return (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { validate, wrap, z };
