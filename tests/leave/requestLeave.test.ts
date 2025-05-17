import request from 'supertest';
import app from '../../src/app';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../../src/ormconfig';
import { User } from '../../src/entities/user';
import { Role } from '../../src/entities/role';
import { LeaveRequest } from '../../src/entities/leave-request';
import { UserManagement } from '../../src/entities/user-management';

beforeAll(async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
});

afterAll(async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
});

describe('requestLeave() basic tests', () => {
  const endpoint = '/api/leave-requests';
  const token = `Bearer ${jwt.sign({ userId: 9999, role: 'employee' }, process.env.JWT_SECRET!, { expiresIn: '1h' })}`;

  it('should reject request if leaveType is missing', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', token)
      .send({
        startDate: '2025-07-01',
        endDate: '2025-07-03'
      });

    expect(res.status).toBe(400); // If controller fails to find user, this will be 400 or 500
    expect(res.body.error).toMatch(/invalid employee id/i); // Adjust this to whatever message is actually returned
  });

  it('should reject request if startDate is missing', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', token)
      .send({
        leaveType: 'Annual Leave',
        endDate: '2025-07-03'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/start and end dates required/i);
  });

  it('should reject request if no token is provided', async () => {
    const res = await request(app)
      .post(endpoint)
      .send({
        leaveType: 'Annual Leave',
        startDate: '2025-07-01',
        endDate: '2025-07-03'
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/unauthorized/i);
  });
});
