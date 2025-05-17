import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/ormconfig';
import { User } from '../../src/entities/user';
import { LeaveRequest } from '../../src/entities/leave-request';

beforeAll(async () => {
  if (!AppDataSource.isInitialized) await AppDataSource.initialize();
});

afterAll(async () => {
  await AppDataSource.destroy();
});

describe('requestLeave() - valid request', () => {
  let token: string;
  let userId: number;

  beforeAll(async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'unit-employee@example.com',
      password: 'secure123',
    });

    token = `Bearer ${loginRes.body.token}`;

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email: 'unit-employee@example.com' } });
    userId = user?.userId!;
  });

  afterEach(async () => {
    const leaveRepo = AppDataSource.getRepository(LeaveRequest);
    await leaveRepo.delete({ user: { userId } });
  });

  it('should accept a valid leave request within balance', async () => {
    const res = await request(app)
      .post('/api/leave-requests')
      .set('Authorization', token)
      .send({
        leaveType: 'Annual Leave',
        startDate: '2025-08-01',
        endDate: '2025-08-02',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.status).toBe('Pending');
  });
});
