const crypto = require('crypto');

const KEY_LENGTH = 64;
const HASH_PREFIX = 'scrypt';

function hashSecret(secret) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(secret), salt, KEY_LENGTH).toString('hex');
  return `${HASH_PREFIX}$${salt}$${hash}`;
}

function isHashedSecret(value) {
  return typeof value === 'string' && value.startsWith(`${HASH_PREFIX}$`);
}

function verifySecret(secret, stored) {
  if (!stored) return false;

  if (!isHashedSecret(stored)) {
    return String(secret) === String(stored);
  }

  const [, salt, hash] = stored.split('$');
  if (!salt || !hash) return false;

  const actual = Buffer.from(crypto.scryptSync(String(secret), salt, KEY_LENGTH).toString('hex'), 'hex');
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

module.exports = {
  hashSecret,
  isHashedSecret,
  verifySecret
};
