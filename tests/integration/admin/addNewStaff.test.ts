import 'reflect-metadata';
import httpMocks from 'node-mocks-http';
import crypto from 'crypto';
import { AppDataSource } from '../../../src/ormconfig';
import { addNewStaff } from '../../../src/controllers/admin.controller';

describe('Admin – addNewStaff', () => {
  beforeAll(async () => {
    await AppDataSource.initialize();
  });
  afterAll(async () => {
    await AppDataSource.destroy();
  });

  it('should reject non-admin', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      url: '/api/admin/staff',
      user: { role: 'employee', userId: 999 },
      body: {},
    });
    const res = httpMocks.createResponse();
    await addNewStaff(req as any, res as any);
    expect(res.statusCode).toBe(403);
    expect(res._getJSONData().error).toBe('Only admins can add staff');
  });

  it('should reject when required fields are missing', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      url: '/api/admin/staff',
      user: { role: 'admin', userId: 1 },
      body: { firstname: 'Joe' /* missing everything else */ },
    });
    const res = httpMocks.createResponse();
    await addNewStaff(req as any, res as any);
    expect(res.statusCode).toBe(400);
    expect(res._getJSONData().error).toBe('Missing required fields');
  });

  it('should add a brand-new staff member', async () => {
    
    const uniqueEmail = `test${Date.now()}@example.com`;
    const req = httpMocks.createRequest({
      method: 'POST',
      url: '/api/admin/staff',
      user: { role: 'admin', userId: 1 },
      body: {
        firstname: 'Test',
        surname: 'User',
        email: uniqueEmail,
        password: 'p@ssw0rd',
        department: 'QA',
        roleId: 1,              
      },
    });
    const res = httpMocks.createResponse();
    await addNewStaff(req as any, res as any);

    const json = res._getJSONData();
    expect(res.statusCode).toBe(201);
    expect(json).toHaveProperty('message', 'Staff member added');
    expect(json.data).toHaveProperty('id');
    expect(json.data).toHaveProperty('email', uniqueEmail);
  });
});
