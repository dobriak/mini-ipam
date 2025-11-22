const request = require('supertest');
const path = require('path');

// Ensure server uses an in-memory DB for tests
process.env.DATABASE_PATH = ':memory:';

const { app, ready, dbGetter } = require('../index');

beforeAll(async () => {
  await ready;
});

afterAll((done) => {
  try {
    const db = dbGetter();
    if (db) db.close(done);
    else done();
  } catch (e) {
    done();
  }
});

describe('Collections API', () => {
  test('creates a valid collection', async () => {
    const res = await request(app)
      .post('/api/collections')
      .send({ name: 'Office', cidr: '192.168.10.0/24' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.name).toBe('Office');
  });

  test('rejects invalid cidr', async () => {
    const res = await request(app)
      .post('/api/collections')
      .send({ name: 'Bad', cidr: '300.300.0.0/24' });
    expect(res.statusCode).toBe(400);
  });

  test('rejects overlapping cidr', async () => {
    // existing 'Office' is 192.168.10.0/24 from earlier test
    const res = await request(app)
      .post('/api/collections')
      .send({ name: 'Overlap', cidr: '192.168.10.128/25' });
    expect(res.statusCode).toBe(400);
  });
});

describe('Nodes API', () => {
  let collectionId;
  let nodeId;

  test('create collection for node tests', async () => {
    const res = await request(app).post('/api/collections').send({ name: 'LAN', cidr: '192.168.50.0/24' });
    expect(res.statusCode).toBe(200);
    collectionId = res.body.data.id;
  });

  test('creates a node without collection', async () => {
    const res = await request(app).post('/api/nodes').send({ ip_address: '192.168.1.5', port: 8080 });
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.port).toBe(8080);
    nodeId = res.body.data.id;
  });

  test('rejects node with invalid port', async () => {
    const res = await request(app).post('/api/nodes').send({ ip_address: '192.168.1.6', port: 70000 });
    expect(res.statusCode).toBe(400);
  });

  test('creates a node inside collection', async () => {
    const res = await request(app).post('/api/nodes').send({ ip_address: '192.168.50.10', port: 1234, collection_id: collectionId });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.collection_id).toBe(collectionId);
  });

  test('rejects node outside collection', async () => {
    const res = await request(app).post('/api/nodes').send({ ip_address: '10.0.0.5', port: 1234, collection_id: collectionId });
    expect(res.statusCode).toBe(400);
  });

  test('updates node with name and notes', async () => {
    const res = await request(app).put(`/api/nodes/${nodeId}`).send({ ip_address: '192.168.1.5', port: 8080, name: 'web', notes: 'updated' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('updated');
  });

  test('lists nodes and collections', async () => {
    const r1 = await request(app).get('/api/nodes');
    expect(r1.statusCode).toBe(200);
    expect(Array.isArray(r1.body.data)).toBe(true);
    const r2 = await request(app).get('/api/collections');
    expect(r2.statusCode).toBe(200);
    expect(Array.isArray(r2.body.data)).toBe(true);
  });

  test('deletes node', async () => {
    const res = await request(app).delete(`/api/nodes/${nodeId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('deleted');
  });
});
