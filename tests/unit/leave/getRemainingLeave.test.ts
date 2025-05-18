
import { getRemainingLeave } from '../../../src/controllers/leave-request.controller';
import { AppDataSource } from '../../../src/ormconfig';
import { Request, Response } from 'express';

jest.mock('../../../src/ormconfig', () => ({
  AppDataSource: { getRepository: jest.fn() },
}));

describe('getRemainingLeave (unit, fully mocked)', () => {
  it('returns remaining leave for a valid user', async () => {
    
    const findOneMock = jest.fn().mockResolvedValue({ userId: 7, annualLeaveBalance: 15 });
    (AppDataSource.getRepository as jest.Mock).mockReturnValue({ findOne: findOneMock });

    const req = { user: { userId: 7 } } as any as Request;
    const jsonMock = jest.fn();
    const res = { json: jsonMock } as any as Response;

    await getRemainingLeave(req, res);

    expect(findOneMock).toHaveBeenCalledWith({ where: { userId: 7 } });
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Status of leave requests for employee_id 7',
      data: { 'days remaining': 15 },
    });
  });

  it('returns 400 if no user present', async () => {
    const statusMock = jest.fn().mockReturnValue({ json: jest.fn() });
    const res = { status: statusMock } as any as Response;
    const req = { user: undefined } as any as Request;

    await getRemainingLeave(req, res);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(statusMock().json).toHaveBeenCalledWith({ error: 'Invalid employee ID' });
  });

  it('returns 400 if user not found', async () => {
    const findOneMock = jest.fn().mockResolvedValue(null);
    (AppDataSource.getRepository as jest.Mock).mockReturnValue({ findOne: findOneMock });

    const req = { user: { userId: 8 } } as any as Request;
    const statusMock = jest.fn().mockReturnValue({ json: jest.fn() });
    const res = { status: statusMock } as any as Response;

    await getRemainingLeave(req, res);

    expect(findOneMock).toHaveBeenCalledWith({ where: { userId: 8 } });
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(statusMock().json).toHaveBeenCalledWith({ error: 'Invalid employee ID' });
  });
});
