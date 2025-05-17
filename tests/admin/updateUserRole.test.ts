import 'reflect-metadata';
import httpMocks from 'node-mocks-http';
import { AppDataSource } from '../../src/ormconfig';
import { updateUserRole } from '../../src/controllers/admin.controller';
import { User } from '../../src/entities/user';

describe('Admin – updateUserRole', () => {
  let existingUserId: number;

  beforeAll(async () => {
    await AppDataSource.initialize();
    // pick one of your seeded employees
    const repo = AppDataSource.getRepository(User);
    const u = await repo.findOne({ where: { email: 'unit-employee@example.com' } });
    if (!u) throw new Error('unit-employee@example.com must exist in seed');
    existingUserId = u.userId;
  });
  afterAll(async () => {
    await AppDataSource.destroy();
  });

  it('should reject if caller is not admin', async () => {
    const req = httpMocks.createRequest({
      method: 'PATCH',
      url: `/api/admin/users/${existingUserId}/role`,
      params: { userId: existingUserId.toString() },
      user: { role: 'manager', userId: 2 },
      body: { roleId: 2 },
    });
    const res = httpMocks.createResponse();
    await updateUserRole(req as any, res as any);
    expect(res.statusCode).toBe(403);
    expect(res._getJSONData().error).toBe('Only admins can update roles');
  });

  it('should reject if no roleId provided', async () => {
    const req = httpMocks.createRequest({
      method: 'PATCH',
      url: `/api/admin/users/${existingUserId}/role`,
      params: { userId: existingUserId.toString() },
      user: { role: 'admin', userId: 3 },
      body: {},
    });
    const res = httpMocks.createResponse();
    await updateUserRole(req as any, res as any);
    expect(res.statusCode).toBe(400);
    expect(res._getJSONData().error).toBe('New roleId is required');
  });

  it('should reject if user does not exist', async () => {
    const req = httpMocks.createRequest({
      method: 'PATCH',
      url: `/api/admin/users/9999/role`,
      params: { userId: '9999' },
      user: { role: 'admin', userId: 3 },
      body: { roleId: 1 },
    });
    const res = httpMocks.createResponse();
    await updateUserRole(req as any, res as any);
    expect(res.statusCode).toBe(404);
    expect(res._getJSONData().error).toBe('User not found');
  });

  it('should update an existing user’s role', async () => {
    const req = httpMocks.createRequest({
      method: 'PATCH',
      url: `/api/admin/users/${existingUserId}/role`,
      params: { userId: existingUserId.toString() },
      user: { role: 'admin', userId: 3 },
      body: { roleId: 2 },  // change to manager
    });
    const res = httpMocks.createResponse();
    await updateUserRole(req as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res._getJSONData().message).toMatch(
      new RegExp(`Role updated for user ${existingUserId}`)
    );
  });
});
