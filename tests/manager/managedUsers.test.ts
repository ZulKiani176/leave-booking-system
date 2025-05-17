import request from 'supertest';
import app from '../../src/app';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../../src/ormconfig';
import { User } from '../../src/entities/user';

describe('getManagedEmployees()', () => {
  let token: string;

  beforeAll(async () => {
    await AppDataSource.initialize();
    const userRepo = AppDataSource.getRepository(User);

    const manager = await userRepo.findOne({ where: { email: 'unit-manager@example.com' } });

    if (!manager) throw new Error('Unit test manager not found');

    token = jwt.sign(
      { userId: manager.userId, role: 'manager' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  it('should return list of managed employees', async () => {
    const res = await request(app)
      .get('/api/leave-requests/managed-users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const employee = res.body.data.find((e: any) => e.firstname === 'Unit' && e.surname === 'Employee');
    expect(employee).toBeDefined();
  });
});
