
import { getLeaveStatus } from '../../../src/controllers/leave-request.controller';
import { AppDataSource } from '../../../src/ormconfig';
import { Request, Response } from 'express';

jest.mock('../../../src/ormconfig', () => ({
  AppDataSource: { getRepository: jest.fn() },
}));

describe('getLeaveStatus (unit, fully mocked)', () => {
  it('returns formatted leave requests for a valid user', async () => {
    
    const mockLeaves = [
      {
        leaveRequestId: 1,
        startDate: '2025-01-01',
        endDate: '2025-01-03',
        status: 'Cancelled',
        reason: 'Change of plans',
        user: { userId: 42 },
      },
      {
        leaveRequestId: 2,
        startDate: '2025-02-01',
        endDate: '2025-02-02',
        status: 'Approved',
        reason: null,
        user: { userId: 42 },
      },
    ];

    
    const findMock = jest.fn().mockResolvedValue(mockLeaves);
    (AppDataSource.getRepository as jest.Mock).mockReturnValue({
      find: findMock,
    });

    
    const req = { user: { userId: 42 } } as any as Request;
    const jsonMock = jest.fn();
    const res = { json: jsonMock } as any as Response;

    await getLeaveStatus(req, res);

    
    expect(findMock).toHaveBeenCalledWith({
      where: { user: { userId: 42 } },
      order: { startDate: 'ASC' },
    });

    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Status of leave requests for employee_id 42',
      data: [
        {
          id: 1,
          start_date: '2025-01-01',
          end_date: '2025-01-03',
          status: 'Cancelled',
          reason: 'Change of plans',
        },
        {
          id: 2,
          start_date: '2025-02-01',
          end_date: '2025-02-02',
          status: 'Approved',
          reason: null,
        },
      ],
    });
  });

  it('returns 400 if no user present', async () => {
    const statusMock = jest.fn().mockReturnValue({ json: jest.fn() });
    const res = { status: statusMock } as any as Response;
    const req = { user: undefined } as any as Request;

    await getLeaveStatus(req, res);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(statusMock().json).toHaveBeenCalledWith({ error: 'Invalid employee ID' });
  });
});
