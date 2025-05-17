import 'reflect-metadata';
import httpMocks from 'node-mocks-http';
import { AppDataSource } from '../../src/ormconfig';
import { getAllUsers } from '../../src/controllers/admin.controller';

describe('Admin – getAllUsers', () => {
  beforeAll(async () => {
    await AppDataSource.initialize();
  });
  afterAll(async () => {
    await AppDataSource.destroy();
  });

  it('should reject if caller is not admin', async () => {
    const req = httpMocks.createRequest({
      method: 'GET',
      url: '/api/admin/users',
      user: { role: 'employee' },
    });
    const res = httpMocks.createResponse();
    await getAllUsers(req as any, res as any);
    expect(res.statusCode).toBe(403);
    expect(res._getJSONData().error).toBe('Only admins can view all users');
  });

  it('should return a list of users for admin', async () => {
    const req = httpMocks.createRequest({
      method: 'GET',
      url: '/api/admin/users',
      user: { role: 'admin', userId: 3 },
    });
    const res = httpMocks.createResponse();
    await getAllUsers(req as any, res as any);

    const json = res._getJSONData();
    expect(res.statusCode).toBe(200);
    expect(json.message).toBe('All users in the system');
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
    // make sure each element has at least these keys:
    expect(json.data[0]).toMatchObject({
      userId: expect.any(Number),
      firstname: expect.any(String),
      surname: expect.any(String),
      email: expect.any(String),
      department: expect.any(String),
      role: expect.any(String),
      annualLeaveBalance: expect.any(Number),
    });
  });
});
