// tests/unit/admin/updateAnnualLeaveBalance.test.ts
import { Request, Response } from 'express';
import { AppDataSource } from '../../../src/ormconfig';

// 1) Mock logger to avoid file writes
jest.mock('../../../src/utils/logger', () => ({
  logClientError: jest.fn(),
}));

// 2) Mock ORM before importing the controller
const mockUserRepo = { findOne: jest.fn(), save: jest.fn() };
jest.mock('../../../src/ormconfig', () => ({
  AppDataSource: { getRepository: jest.fn().mockReturnValue(mockUserRepo) },
}));

// 3) Import after mocks
import { updateAnnualLeaveBalance } from '../../../src/controllers/admin.controller';
import { User } from '../../../src/entities/user';

describe('updateAnnualLeaveBalance (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function makeReqRes(params: any, body: any, userRole: string) {
    const jsonMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    const req = { params, body, user: { role: userRole } } as any as Request;
    const res = { status: statusMock, json: jsonMock } as any as Response;
    return { req, res, statusMock, jsonMock };
  }

  it('403 if caller is not admin', async () => {
    const { req, res, statusMock } = makeReqRes({ userId: '1' }, { balance: 10 }, 'employee');
    await updateAnnualLeaveBalance(req, res);
    expect(statusMock).toHaveBeenCalledWith(403);
    expect(statusMock().json).toHaveBeenCalledWith({ error: 'Only admins can update leave balances' });
  });

  it('400 if balance is invalid (non-numeric or negative)', async () => {
    const { req: r1, res: s1, statusMock: st1 } = makeReqRes({ userId: '1' }, { balance: -5 }, 'admin');
    await updateAnnualLeaveBalance(r1, s1);
    expect(st1).toHaveBeenCalledWith(400);
    expect(st1().json).toHaveBeenCalledWith({ error: 'Invalid balance value' });

    const { req: r2, res: s2, statusMock: st2 } = makeReqRes({ userId: '1' }, { balance: NaN }, 'admin');
    await updateAnnualLeaveBalance(r2, s2);
    expect(st2).toHaveBeenCalledWith(400);
    expect(st2().json).toHaveBeenCalledWith({ error: 'Invalid balance value' });
  });

  it('404 if user not found', async () => {
    mockUserRepo.findOne.mockResolvedValue(null);
    const { req, res, statusMock } = makeReqRes({ userId: '42' }, { balance: 15 }, 'admin');
    await updateAnnualLeaveBalance(req, res);
    expect(mockUserRepo.findOne).toHaveBeenCalledWith({ where: { userId: 42 } });
    expect(statusMock).toHaveBeenCalledWith(404);
    expect(statusMock().json).toHaveBeenCalledWith({ error: 'User not found' });
  });

  it('200 and updates balance on success', async () => {
    const existingUser = { userId: 7, annualLeaveBalance: 5 } as User;
    mockUserRepo.findOne.mockResolvedValue(existingUser);
    mockUserRepo.save.mockResolvedValue({ ...existingUser, annualLeaveBalance: 20 });

    const { req, res, jsonMock } = makeReqRes({ userId: '7' }, { balance: 20 }, 'admin');
    await updateAnnualLeaveBalance(req, res);

    expect(mockUserRepo.findOne).toHaveBeenCalledWith({ where: { userId: 7 } });
    expect(mockUserRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 7, annualLeaveBalance: 20 })
    );
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Annual leave balance updated to 20 for user 7',
    });
  });
});
