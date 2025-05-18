import request from 'supertest';
import app from '../../../src/app';
import { AppDataSource } from '../../../src/ormconfig';
import { User } from '../../../src/entities/user';
import jwt from 'jsonwebtoken';

let token: string;

beforeAll(async () => {
  await AppDataSource.initialize();
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { email: 'unit-employee@example.com' } });

  if (!user) throw new Error('Test user not found');
  token = jwt.sign({ userId: user.userId, role: 'employee' }, process.env.JWT_SECRET!, {
    expiresIn: '1h',
  });
});

afterAll(async () => {
  await AppDataSource.destroy();
});

const endpoint = '/api/leave-requests';

describe('requestLeave() rejection cases', () => {
  it('should reject if no token is provided', async () => {
    const res = await request(app).post(endpoint).send({
      leaveType: 'Annual Leave',
      startDate: '2025-07-01',
      endDate: '2025-07-03',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/unauthorized/i);
  });

  it('should reject if startDate is missing', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${token}`)
      .send({
        leaveType: 'Annual Leave',
        endDate: '2025-07-03',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/start and end dates required/i);
  });

  it('should reject if endDate is missing', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${token}`)
      .send({
        leaveType: 'Annual Leave',
        startDate: '2025-07-01',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/start and end dates required/i);
  });

  it('should reject if endDate is before startDate', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${token}`)
      .send({
        leaveType: 'Annual Leave',
        startDate: '2025-08-03',
        endDate: '2025-08-01',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/end date of .* is before the start date/i);
  });

  it('should reject if start date is in the past', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${token}`)
      .send({
        leaveType: 'Annual Leave',
        startDate: '2020-01-01',
        endDate: '2020-01-03',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot request leave in the past/i);
  });

  it('should reject if requested days exceed balance', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${token}`)
      .send({
        leaveType: 'Annual Leave',
        startDate: '2025-12-01',
        endDate: '2026-01-31', // ~2 months
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/days requested exceed remaining balance/i);
  });
});
