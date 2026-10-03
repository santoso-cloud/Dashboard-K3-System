'use strict';
const createController = require('./register-controller');
const registerLimit = require('./rate-limit');
const passwordService = require('../backend/src/services/passwordService');
module.exports = function mountRegister(app, pool) {
  app.post('/api/auth/register', registerLimit(), createController({ pool, passwordService }));
};
