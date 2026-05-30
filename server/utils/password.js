/**
 * utils/password.js — bcrypt-based password hashing
 *
 * Replaces the old SHA-256 + static-salt approach.
 * Provides a transparent migration path: on first successful login
 * with an old-format hash, the stored hash is upgraded to bcrypt automatically.
 */
'use strict';
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 12;
const LEGACY_SALT   = 'talentos_salt';

function legacyHash(pw) {
  return crypto.createHash('sha256').update(pw + LEGACY_SALT).digest('hex');
}

function isLegacyHash(stored) {
  return typeof stored === 'string' && /^[0-9a-f]{64}$/.test(stored);
}

async function hashPassword(pw) {
  return bcrypt.hash(pw, BCRYPT_ROUNDS);
}

function hashPasswordSync(pw) {
  return bcrypt.hashSync(pw, BCRYPT_ROUNDS);
}

async function verifyPassword(plain, stored) {
  if (!stored) return { valid: false, needsRehash: false };
  if (isLegacyHash(stored)) {
    const legacy = legacyHash(plain);
    if (legacy !== stored) return { valid: false, needsRehash: false };
    return { valid: true, needsRehash: true };
  }
  const valid = await bcrypt.compare(plain, stored);
  return { valid, needsRehash: false };
}

module.exports = { hashPassword, hashPasswordSync, verifyPassword, isLegacyHash };
