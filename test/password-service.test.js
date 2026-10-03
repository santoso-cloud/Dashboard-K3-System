'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword } = require('../backend/src/services/passwordService');

test('new passwords are bcrypt-hashed and verified', async () => {
  const hash = await hashPassword('temporary-test-password');
  assert.match(hash, /^\$2[aby]\$12\$/);
  assert.deepEqual(await verifyPassword('temporary-test-password', hash), {
    matches: true,
    needsRehash: false
  });
});

test('legacy plaintext passwords are accepted once and marked for bcrypt upgrade', async () => {
  assert.deepEqual(await verifyPassword('legacy-test-password', 'legacy-test-password'), {
    matches: true,
    needsRehash: true
  });
  assert.deepEqual(await verifyPassword('wrong-password', 'legacy-test-password'), {
    matches: false,
    needsRehash: false
  });
});

test('malformed hash strings are not treated as legacy plaintext', async () => {
  assert.deepEqual(await verifyPassword('bad-hash', '$2b$not-a-valid-bcrypt-hash'), {
    matches: false,
    needsRehash: false
  });
});