// tests/unit/admin/getAllUsers.test.ts
import { getAllUsers } from '../../../src/controllers/admin.controller';
import { AppDataSource } from '../../../src/ormconfig';
import { User } from '../../../src/entities/user';
import { Request, Response } from 'express';

jest.mock('../../../src/ormconfig', () => ({
  AppDataSource: { getRepository: jest.fn() },
}));

describe('getAllUsers (unit)', () => {
  const getRepo = AppDataSource.getRepository as jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return 403 if caller is not admin', async () => {
    const req = { user: { role: 'manager' } } as any as Request;
    const statusMock = jest.fn().mockReturnValue({ json: jest.fn() });
    const res = { status: statusMock } as any as Response;

    await getAllUsers(req, res);

    expect(statusMock).toHaveBeenCalledWith(403);
  });

  it('should return all users on success', async () => {
    const users = [
      {
        userId: 1,
        firstname: 'Alice',
        surname: 'A',
        email: 'alice@example.com',
        department: 'IT',
        annualLeaveBalance: 25,
        role: { name: 'employee' },
      },
      {
        userId: 2,
        firstname: 'Bob',
        surname: 'B',
        email: 'bob@example.com',
        department: 'HR',
        annualLeaveBalance: 20,
        role: { name: 'manager' },
      },
    ];
    const findMock = jest.fn().mockResolvedValue(users);
    getRepo.mockReturnValue({ find: findMock });

    const req = { user: { role: 'admin' } } as any as Request;
    const jsonMock = jest.fn();
    const res = { json: jsonMock } as any as Response;

    await getAllUsers(req, res);

    expect(findMock).toHaveBeenCalledWith({ relations: ['role'] });
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'All users in the system',
      data: [
        {
          userId: 1,
          firstname: 'Alice',
          surname: 'A',
          email: 'alice@example.com',
          department: 'IT',
          role: 'employee',
          annualLeaveBalance: 25,
        },
        {
          userId: 2,
          firstname: 'Bob',
          surname: 'B',
          email: 'bob@example.com',
          department: 'HR',
          role: 'manager',
          annualLeaveBalance: 20,
        },
      ],
    });
  });
});
