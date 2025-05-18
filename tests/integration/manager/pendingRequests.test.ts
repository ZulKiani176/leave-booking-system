import request from 'supertest';
import app from '../../../src/app';
import { AppDataSource } from '../../../src/ormconfig';
import { User } from '../../../src/entities/user';
import jwt from 'jsonwebtoken';

describe('getPendingRequests()', () => {
  let token: string;

  beforeAll(async () => {
    await AppDataSource.initialize();

    const repo = AppDataSource.getRepository(User);
    const manager = await repo.findOne({ where: { email: 'unit-manager@example.com' } });

    if (!manager) throw new Error('Test manager not found');

    token = jwt.sign(
      { userId: manager.userId, role: 'manager' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  it('should return pending requests from managed employees', async () => {
    const res = await request(app)
      .get('/api/leave-requests/pending')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);

    if (res.body.data.length > 0) {
      const sample = res.body.data[0];
      expect(sample).toHaveProperty('request_id');
      expect(sample).toHaveProperty('employee_id');
      expect(sample).toHaveProperty('name');
      expect(sample).toHaveProperty('start_date');
      expect(sample).toHaveProperty('end_date');
      expect(sample.status).toBe('Pending');
    }
  });
});
