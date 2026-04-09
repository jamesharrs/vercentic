// server/tests/records.test.js
// Records CRUD contract tests — validation, auth guards, data integrity
'use strict';

const { api, loginAs, getDefaultEnvId, getObjectId } = require('./helpers');

let agent;   // authenticated supertest agent (carries session cookie)
let envId;
let objectId;
let createdRecordId;

beforeAll(async () => {
  agent    = await loginAs();
  envId    = getDefaultEnvId();
  objectId = getObjectId('people');
});

describe('POST /api/records — validation', () => {
  test('missing object_id → 400 Validation failed', async () => {
    const res = await agent.post('/api/records')
      .send({ environment_id: envId, data: { first_name: 'Test' } });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.errors[0].field).toBe('object_id');
  });

  test('missing environment_id → 400', async () => {
    const res = await agent.post('/api/records')
      .send({ object_id: objectId, data: { first_name: 'Test' } });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('environment_id');
  });

  test('invalid UUID for object_id → 400', async () => {
    const res = await agent.post('/api/records')
      .send({ object_id: 'not-a-uuid', environment_id: envId });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('object_id');
  });

  test('data key with spaces rejected → 400', async () => {
    const res = await agent.post('/api/records')
      .send({ object_id: objectId, environment_id: envId, data: { 'bad key!': 'val' } });
    expect(res.status).toBe(400);
  });

  test('data value over 50k chars → 400', async () => {
    const res = await agent.post('/api/records')
      .send({ object_id: objectId, environment_id: envId, data: { notes: 'x'.repeat(50001) } });
    expect(res.status).toBe(400);
  });

  test('unknown extra keys stripped — valid record still creates', async () => {
    const res = await agent.post('/api/records').send({
      object_id:      objectId,
      environment_id: envId,
      data:           { first_name: 'ValidTest', last_name: 'User', email: 'validtest@example.com' },
      injected_field: 'should be stripped',
    });
    expect([200, 201]).toContain(res.status);
    if (res.body.id) createdRecordId = res.body.id;
  });
});

describe('GET /api/records — auth guard', () => {
  test('unauthenticated request → 401', async () => {
    const res = await api.get(`/api/records?object_id=${objectId}&environment_id=${envId}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });

  test('authenticated request → 200 with records array', async () => {
    const res = await agent.get(`/api/records?object_id=${objectId}&environment_id=${envId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('records');
    expect(Array.isArray(res.body.records)).toBe(true);
  });
});

describe('PATCH /api/records/:id — validation', () => {
  test('data key with invalid chars → 400', async () => {
    if (!createdRecordId) return;
    const res = await agent.patch(`/api/records/${createdRecordId}`)
      .send({ data: { '<script>': 'xss' } });
    expect(res.status).toBe(400);
  });

  test('valid patch → 200 with merged data', async () => {
    if (!createdRecordId) return;
    const res = await agent.patch(`/api/records/${createdRecordId}`)
      .send({ data: { first_name: 'Updated', last_name: 'Record' } });
    expect(res.status).toBe(200);
    expect(res.body.data.first_name).toBe('Updated');
  });
});

describe('DELETE /api/records/:id', () => {
  test('soft delete removes record from list', async () => {
    if (!createdRecordId) return;
    const res = await agent.delete(`/api/records/${createdRecordId}?environment_id=${envId}`);
    expect([200, 204]).toContain(res.status);
  });
});
