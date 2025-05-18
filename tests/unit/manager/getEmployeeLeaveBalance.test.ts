// tests/manager/getEmployeeLeaveBalance.test.ts
import { getEmployeeLeaveBalance } from '../../../src/controllers/leave-request.controller';
import { AppDataSource } from '../../../src/ormconfig';
import { UserManagement } from '../../../src/entities/user-management';
import { User } from '../../../src/entities/user';
import { Request, Response } from 'express';

jest.mock('../../../src/ormconfig', () => ({
  AppDataSource: { getRepository: jest.fn() },
}));

const getRepo = AppDataSource.getRepository as jest.Mock;

describe('getEmployeeLeaveBalance (unit, fully mocked)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('403 if caller is not a manager', async () => {
    const req = { params: { userId: '2' }, user: { role: 'employee', userId: 1 } } as any;
    const statusMock = jest.fn().mockReturnValue({ json: jest.fn() });
    const res = { status: statusMock } as any;

    await getEmployeeLeaveBalance(req, res);

    expect(statusMock).toHaveBeenCalledWith(403);
  });

  it('400 if userId param is invalid', async () => {
    const req = { params: { userId: 'foo' }, user: { role: 'manager', userId: 1 } } as any;
    const statusMock = jest.fn().mockReturnValue({ json: jest.fn() });
    const res = { status: statusMock } as any;

    await getEmployeeLeaveBalance(req, res);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(statusMock().json).toHaveBeenCalledWith({ error: 'Invalid employee ID' });
  });

  it('403 if manager does not manage that employee', async () => {
    // managementRepo.findOne returns null
    getRepo.mockImplementation((entity) => {
      if (entity === UserManagement) {
        return { findOne: jest.fn().mockResolvedValue(null) };
      }
      // should not call User repo in this branch
      return { findOne: jest.fn() };
    });

    const req = { params: { userId: '2' }, user: { role: 'manager', userId: 1 } } as any;
    const statusMock = jest.fn().mockReturnValue({ json: jest.fn() });
    const res = { status: statusMock } as any;

    await getEmployeeLeaveBalance(req, res);

    expect(getRepo).toHaveBeenCalledWith(UserManagement);
    expect(statusMock).toHaveBeenCalledWith(403);
    expect(statusMock().json).toHaveBeenCalledWith({ error: 'You do not manage this employee' });
  });

  it('400 if managed but employee not found', async () => {
    // managementRepo.findOne returns truthy, userRepo.findOne returns null
    getRepo.mockImplementation((entity) => {
      if (entity === UserManagement) {
        return { findOne: jest.fn().mockResolvedValue({ id: 99 }) };
      }
      if (entity === User) {
        return { findOne: jest.fn().mockResolvedValue(null) };
      }
      throw new Error('Unexpected entity');
    });

    const req = { params: { userId: '2' }, user: { role: 'manager', userId: 1 } } as any;
    const statusMock = jest.fn().mockReturnValue({ json: jest.fn() });
    const res = { status: statusMock } as any;

    await getEmployeeLeaveBalance(req, res);

    expect(getRepo).toHaveBeenCalledWith(UserManagement);
    expect(getRepo).toHaveBeenCalledWith(User);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(statusMock().json).toHaveBeenCalledWith({ error: 'Employee not found' });
  });

  it('200 and JSON body on success', async () => {
    // managementRepo.findOne returns truthy, userRepo.findOne returns a user
    const mockUser = { userId: 2, firstname: 'Jane', surname: 'Smith', annualLeaveBalance: 12 };
    getRepo.mockImplementation((entity) => {
      if (entity === UserManagement) {
        return { findOne: jest.fn().mockResolvedValue({ id: 7 }) };
      }
      if (entity === User) {
        return { findOne: jest.fn().mockResolvedValue(mockUser) };
      }
      throw new Error('Unexpected entity');
    });

    const req = { params: { userId: '2' }, user: { role: 'manager', userId: 1 } } as any;
    const jsonMock = jest.fn();
    const res = { json: jsonMock } as any;

    await getEmployeeLeaveBalance(req, res);

    expect(getRepo).toHaveBeenCalledWith(UserManagement);
    expect(getRepo).toHaveBeenCalledWith(User);
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Annual leave balance for employee_id 2',
      data: {
        userId: 2,
        firstname: 'Jane',
        surname: 'Smith',
        'days remaining': 12,
      },
    });
  });
});
