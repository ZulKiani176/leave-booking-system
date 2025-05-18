// tests/unit/leave/requestLeave.test.ts
import { requestLeave } from '../../../src/controllers/leave-request.controller';
import { AppDataSource } from '../../../src/ormconfig';
import { User } from '../../../src/entities/user';
import { LeaveRequest } from '../../../src/entities/leave-request';
import { Request, Response } from 'express';

jest.mock('../../../src/ormconfig', () => ({
  AppDataSource: { getRepository: jest.fn() },
}));

describe('requestLeave (unit)', () => {
  let userRepo: any;
  let leaveRepo: any;
  const getRepo = AppDataSource.getRepository as jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();

    userRepo = { findOne: jest.fn() };
    leaveRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };

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

  it('400 if no userId', async () => {
    const { req, res, statusMock } = makeReqRes(
      { startDate: '2025-06-01', endDate: '2025-06-02' },
      undefined
    );
    await requestLeave(req, res);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(statusMock().json).toHaveBeenCalledWith({ error: 'Invalid employee ID' });
  });

  it('400 if missing dates', async () => {
    const { req, res, statusMock } = makeReqRes(
      { startDate: '2025-06-01' },
      { userId: 1 }
    );
    await requestLeave(req, res);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(statusMock().json).toHaveBeenCalledWith({ error: 'Start and end dates required' });
  });

  it('400 if invalid date format', async () => {
    const { req, res, statusMock } = makeReqRes(
      { startDate: 'not-a-date', endDate: '2025-06-02' },
      { userId: 1 }
    );
    await requestLeave(req, res);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(statusMock().json).toHaveBeenCalledWith({ error: 'Invalid date format' });
  });

  it('400 if endDate ≤ startDate', async () => {
    const { req, res, statusMock } = makeReqRes(
      { startDate: '2025-06-05', endDate: '2025-06-05' },
      { userId: 1 }
    );
    await requestLeave(req, res);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(statusMock().json).toHaveBeenCalledWith({
      error: 'End date of 2025-06-05 is before the start date of 2025-06-05',
    });
  });

  it('400 if days exceed balance', async () => {
    userRepo.findOne.mockResolvedValue({ userId: 1, annualLeaveBalance: 1 });
    const { req, res, statusMock } = makeReqRes(
      { startDate: '2025-06-01', endDate: '2025-06-03' },
      { userId: 1 }
    );
    await requestLeave(req, res);
    expect(userRepo.findOne).toHaveBeenCalledWith({ where: { userId: 1 } });
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(statusMock().json).toHaveBeenCalledWith({
      error: 'Days requested exceed remaining balance',
    });
  });

  it('400 if overlapping request exists', async () => {
    userRepo.findOne.mockResolvedValue({ userId: 1, annualLeaveBalance: 10 });
    leaveRepo.findOne.mockResolvedValue({ leaveRequestId: 99 });
    const { req, res, statusMock } = makeReqRes(
      { startDate: '2025-06-10', endDate: '2025-06-12' },
      { userId: 1 }
    );
    await requestLeave(req, res);
    expect(leaveRepo.findOne).toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(statusMock().json).toHaveBeenCalledWith({
      error: 'Date range of request overlaps with existing request',
    });
  });

  it('201 and returns data on success', async () => {
    const fakeLeave = { leaveRequestId: 7, status: 'Pending' };
    userRepo.findOne.mockResolvedValue({ userId: 1, annualLeaveBalance: 10 });
    leaveRepo.findOne.mockResolvedValue(null);
    leaveRepo.create.mockReturnValue(fakeLeave);
    leaveRepo.save.mockResolvedValue(fakeLeave);

    const { req, res, statusMock, jsonMock } = makeReqRes(
      { startDate: '2025-06-15', endDate: '2025-06-16' },
      { userId: 1 }
    );
    await requestLeave(req, res);

    expect(leaveRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ userId: 1 }),
        leaveType: 'Annual Leave',
        reason: 'Standard paid annual leave.',
        startDate: '2025-06-15',
        endDate: '2025-06-16',
        status: 'Pending',
      })
    );
    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Leave request has been submitted for review',
      data: {
        id: 7,
        employee_id: 1,
        start_date: '2025-06-15',
        end_date: '2025-06-16',
        status: 'Pending',
      },
    });
  });
});
