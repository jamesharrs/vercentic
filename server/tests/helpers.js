// server/tests/helpers.js
// Shared test utilities — spins up Express app in-process (no port needed).
'use strict';

const request = require('supertest');

// Boot the Express app without starting the HTTP server
let _app;
function getApp() {
  if (!_app) {
    // Prevent index.js from calling app.listen() during tests
    process.env.NODE_ENV = 'test';
    // Load the app — index.js exports `app` at the bottom
    _app = require('../index');
  }
  return _app;
}

// Convenience wrappers
const api = {
  get:    (path, headers = {}) => request(getApp()).get(path).set(headers),
  post:   (path, body, headers = {}) => request(getApp()).post(path).set(headers).send(body),
  patch:  (path, body, headers = {}) => request(getApp()).patch(path).set(headers).send(body),
  delete: (path, headers = {}) => request(getApp()).delete(path).set(headers),
};

// Login and return a supertest agent that carries the session cookie AND CSRF token automatically.
// All mutation methods (post/patch/put/delete) automatically add X-CSRF-Token.
async function loginAs(email = 'admin@talentos.io', password = 'Admin1234!') {
  const agent = request.agent(getApp());
  const res   = await agent.post('/api/users/login').send({ email, password });
  if (res.status !== 200) throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);

  // Extract CSRF token from Set-Cookie response header
  const cookies    = [].concat(res.headers['set-cookie'] || []);
  const csrfCookie = cookies.find(c => c.startsWith('vercentic_csrf='));
  const csrfToken  = csrfCookie ? csrfCookie.split('=')[1].split(';')[0] : null;

  // Wrap mutation methods to auto-attach the CSRF header — save originals first
  const _post   = agent.post.bind(agent);
  const _patch  = agent.patch.bind(agent);
  const _put    = agent.put.bind(agent);
  const _delete = agent.delete.bind(agent);

  agent.post   = (...args) => _post(...args).set('X-CSRF-Token',   csrfToken || '');
  agent.patch  = (...args) => _patch(...args).set('X-CSRF-Token',  csrfToken || '');
  agent.put    = (...args) => _put(...args).set('X-CSRF-Token',    csrfToken || '');
  agent.delete = (...args) => _delete(...args).set('X-CSRF-Token', csrfToken || '');

  agent._userId     = res.body.id;
  agent._csrfToken  = csrfToken;
  return agent;
}

// Get the first environment id from the store
function getDefaultEnvId() {
  const { getStore } = require('../db/init');
  const store = getStore();
  const env = (store.environments || []).find(e => e.is_default) || (store.environments || [])[0];
  if (!env) throw new Error('No environment found in store');
  return env.id;
}

// Get an object id by slug
function getObjectId(slug) {
  const { getStore } = require('../db/init');
  const store = getStore();
  const obj = (store.objects || []).find(o => o.slug === slug);
  if (!obj) throw new Error(`Object not found: ${slug}`);
  return obj.id;
}

module.exports = { api, getApp, loginAs, getDefaultEnvId, getObjectId };
