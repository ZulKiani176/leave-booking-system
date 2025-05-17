import 'reflect-metadata';
import httpMocks from 'node-mocks-http';
import { AppDataSource } from '../../src/ormconfig';
import { updateUserDepartment } from '../../src/controllers/admin.controller';
import { User } from '../../src/entities/user';

describe('Admin – updateUserDepartment', () => {
  let existingUserId: number;
  const ORIGINAL_DEPT = 'Test';

  beforeAll(async () => {
    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { email: 'unit-employee@example.com' } });
    if (!user) throw new Error('unit-employee@example.com must exist in seed');
    existingUserId = user.userId;
  });

  afterAll(async () => {
    // restore original dept
    const repo = AppDataSource.getRepository(User);
    await repo.update({ userId: existingUserId }, { department: ORIGINAL_DEPT });
    await AppDataSource.destroy();
  });

  it('rejects if caller is not admin', async () => {
    const req = httpMocks.createRequest({
      method: 'PATCH',
      url: `/api/admin/users/${existingUserId}/department`,
      params: { userId: existingUserId.toString() },
      user: { role: 'manager', userId: 2 },
      body: { department: 'Whatever' },
    });
    const res = httpMocks.createResponse();
    await updateUserDepartment(req as any, res as any);

    expect(res.statusCode).toBe(403);
    expect(res._getJSONData().error).toBe('Only admins can update departments');
  });

  it('rejects if new department is missing', async () => {
    const req = httpMocks.createRequest({
      method: 'PATCH',
      url: `/api/admin/users/${existingUserId}/department`,
      params: { userId: existingUserId.toString() },
      user: { role: 'admin', userId: 1 },
      body: { }, // no department
    });
    const res = httpMocks.createResponse();
    await updateUserDepartment(req as any, res as any);

    expect(res.statusCode).toBe(400);
    expect(res._getJSONData().error).toBe('New department is required');
  });

  it('returns 404 if the user does not exist', async () => {
    const req = httpMocks.createRequest({
      method: 'PATCH',
      url: `/api/admin/users/9999/department`,
      params: { userId: '9999' },
      user: { role: 'admin', userId: 1 },
      body: { department: 'X' },
    });
    const res = httpMocks.createResponse();
    await updateUserDepartment(req as any, res as any);

    expect(res.statusCode).toBe(404);
    expect(res._getJSONData().error).toBe('User not found');
  });

  it('updates department successfully for admin', async () => {
    const NEW_DEPT = 'Quality';
    const req = httpMocks.createRequest({
      method: 'PATCH',
      url: `/api/admin/users/${existingUserId}/department`,
      params: { userId: existingUserId.toString() },
      user: { role: 'admin', userId: 1 },
      body: { department: NEW_DEPT },
    });
    const res = httpMocks.createResponse();
    await updateUserDepartment(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res._getJSONData().message)
      .toBe(`Department updated for user ${existingUserId}`);

    // verify in DB
    const repo = AppDataSource.getRepository(User);
    const updated = await repo.findOne({ where: { userId: existingUserId } });
    expect(updated!.department).toBe(NEW_DEPT);
  });
});
