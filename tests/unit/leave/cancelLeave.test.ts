
import { cancelLeave } from '../../../src/controllers/leave-request.controller';
import { AppDataSource } from '../../../src/ormconfig';
import { User } from '../../../src/entities/user';
import { LeaveRequest } from '../../../src/entities/leave-request';
import { Request, Response } from 'express';

jest.mock('../../../src/ormconfig', () => ({
  AppDataSource: { getRepository: jest.fn() },
}));

describe('cancelLeave (unit)', () => {
  let userRepo: any;
  let leaveRepo: any;
  const getRepo = AppDataSource.getRepository as jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();

    userRepo = { save: jest.fn(), findOne: jest.fn() };
    leaveRepo = { findOne: jest.fn(), save: jest.fn() };

    getRepo.mockImplementation((entity) => {
      if (entity === User) return userRepo;
      if (entity === LeaveRequest) return leaveRepo;
      throw new Error('Unexpected entity');
    });
  });

  function makeReqRes(body: any, user?: any) {
    const req = { body, user } as any as Request;
    const jsonMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    const res = { status: statusMock, json: jsonMock } as any as Response;
    return { req, res, statusMock, jsonMock };
  }

  it('400 if leaveRequestId missing', async () => {
    const { req, res, statusMock } = makeReqRes({}, { userId: 1, role: 'employee' });
    await cancelLeave(req, res);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(statusMock().json).toHaveBeenCalledWith({ error: 'Invalid leave request ID' });
  });

  it('400 if leave not found', async () => {
    leaveRepo.findOne.mockResolvedValue(null);
    const { req, res, statusMock } = makeReqRes(
      { leaveRequestId: 123 },
      { userId: 1, role: 'employee' }
    );
    await cancelLeave(req, res);
    expect(leaveRepo.findOne).toHaveBeenCalledWith({
      where: { leaveRequestId: 123 },
      relations: ['user'],
    });
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(statusMock().json).toHaveBeenCalledWith({ error: 'Invalid leave request ID' });
  });

  it('403 if not owner or admin', async () => {
    
    leaveRepo.findOne.mockResolvedValue({
      leaveRequestId: 5,
      status: 'Pending',
      user: { userId: 2, annualLeaveBalance: 10 },
    });
    const { req, res, statusMock } = makeReqRes(
      { leaveRequestId: 5 },
      { userId: 1, role: 'employee' }
    );
    await cancelLeave(req, res);
    expect(statusMock).toHaveBeenCalledWith(403);
    expect(statusMock().json).toHaveBeenCalledWith({ error: 'Unauthorised to cancel this request' });
  });

  it('400 if already cancelled', async () => {
    leaveRepo.findOne.mockResolvedValue({
      leaveRequestId: 5,
      status: 'Cancelled',
      user: { userId: 1, annualLeaveBalance: 10 },
    });
    const { req, res, statusMock } = makeReqRes(
      { leaveRequestId: 5 },
      { userId: 1, role: 'employee' }
    );
    await cancelLeave(req, res);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(statusMock().json).toHaveBeenCalledWith({ error: 'Leave request already cancelled' });
  });

  it('adds back days if approved, then cancels', async () => {
    
    const leave = {
      leaveRequestId: 10,
      status: 'Approved',
      startDate: '2025-06-01',
      endDate: '2025-06-03',
      user: { userId: 1, annualLeaveBalance: 5 },
    };
    leaveRepo.findOne.mockResolvedValue(leave);
    userRepo.save.mockResolvedValue(null);
    leaveRepo.save.mockResolvedValue(null);

    const { req, res, jsonMock } = makeReqRes(
      { leaveRequestId: 10 },
      { userId: 1, role: 'employee' }
    );
    await cancelLeave(req, res);

    
    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, annualLeaveBalance: 5 + 3 })
    );
    expect(leaveRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ leaveRequestId: 10, status: 'Cancelled', reason: expect.any(String) })
    );
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Leave request has been cancelled',
      reason: expect.any(String),
      data: {
        id: 10,
        employee_id: 1,
        start_date: '2025-06-01',
        end_date: '2025-06-03',
        status: 'Cancelled',
      },
    });
  });

  it('200 and cancels pending without adjusting balance', async () => {
    const leave = {
      leaveRequestId: 20,
      status: 'Pending',
      startDate: '2025-07-01',
      endDate: '2025-07-02',
      user: { userId: 2, annualLeaveBalance: 8 },
    };
    leaveRepo.findOne.mockResolvedValue(leave);
    leaveRepo.save.mockResolvedValue(null);

    const { req, res, jsonMock } = makeReqRes(
      { leaveRequestId: 20 },
      { userId: 2, role: 'employee' }
    );
    await cancelLeave(req, res);

    
    expect(userRepo.save).not.toHaveBeenCalled();
    expect(leaveRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ leaveRequestId: 20, status: 'Cancelled' })
    );
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Leave request has been cancelled',
      reason: 'Cancelled by user or admin',
      data: {
        id: 20,
        employee_id: 2,
        start_date: '2025-07-01',
        end_date: '2025-07-02',
        status: 'Cancelled',
      },
    });
  });
});
