import request from 'supertest';
import app from '../../../src/app';
import { AppDataSource } from '../../../src/ormconfig';
import { User } from '../../../src/entities/user';
import { hashPassword } from '../../../src/utils/hash';
import crypto from 'crypto';

describe('login()', () => {
  const endpoint = '/api/auth/login';
  const email = 'unit-employee@example.com';
  const correctPassword = 'secure123';

  beforeAll(async () => {
    await AppDataSource.initialize();
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  it('should login successfully with correct credentials', async () => {
    const res = await request(app).post(endpoint).send({
      email,
      password: correctPassword
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
  });

  it('should reject login with incorrect password', async () => {
    const res = await request(app).post(endpoint).send({
      email,
      password: 'wrongpass'
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  it('should reject login if email is missing', async () => {
    const res = await request(app).post(endpoint).send({
      password: correctPassword
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing email or password/i);
  });

  it('should reject login if password is missing', async () => {
    const res = await request(app).post(endpoint).send({
      email
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing email or password/i);
  });

  it('should reject login with unregistered email', async () => {
    const res = await request(app).post(endpoint).send({
      email: 'nonexistent@example.com',
      password: 'any'
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });
});
