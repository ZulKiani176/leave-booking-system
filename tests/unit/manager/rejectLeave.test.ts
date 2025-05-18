import { rejectLeave } from '../../../src/controllers/leave-request.controller';
import { AppDataSource } from '../../../src/ormconfig';

jest.mock('../../../src/ormconfig', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('rejectLeave (unit, fully mocked)', () => {
  it('rejects a pending leave request with custom reason', async () => {
    
    const mockUser = { userId: 1, annualLeaveBalance: 10 };
    const mockLeave = {
      leaveRequestId: 456,
      status: 'Pending',
      startDate: '2025-07-01',
      endDate: '2025-07-02',
      user: mockUser,
      reason: '',
    };

    const findOneMock = jest.fn().mockResolvedValue(mockLeave);
    const saveMock = jest.fn().mockResolvedValue(undefined);

    (AppDataSource.getRepository as jest.Mock).mockReturnValue({
      findOne: findOneMock,
      save: saveMock,
    });

    const req = {
      body: { leaveRequestId: 456, reason: 'Low staffing' },
      user: { role: 'manager', userId: 1 },
    } as any;

    const jsonMock = jest.fn();
    const res = { json: jsonMock } as any;

    await rejectLeave(req, res);

    expect(findOneMock).toHaveBeenCalledWith({
      where: { leaveRequestId: 456 },
      relations: ['user'],
    });

    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'Rejected',
        reason: 'Low staffing',
      })
    );

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/has been rejected/i),
        data: { reason: 'Low staffing' },
      })
    );
  });

  it('rejects with default reason when none provided', async () => {
    const mockUser = { userId: 2, annualLeaveBalance: 5 };
    const mockLeave = {
      leaveRequestId: 789,
      status: 'Pending',
      startDate: '2025-08-01',
      endDate: '2025-08-02',
      user: mockUser,
      reason: '',
    };

    const findOneMock = jest.fn().mockResolvedValue(mockLeave);
    const saveMock = jest.fn().mockResolvedValue(undefined);
    (AppDataSource.getRepository as jest.Mock).mockReturnValue({
      findOne: findOneMock,
      save: saveMock,
    });

    const req = {
      body: { leaveRequestId: 789 },  
      user: { role: 'manager', userId: 2 },
    } as any;

    const jsonMock = jest.fn();
    const res = { json: jsonMock } as any;

    await rejectLeave(req, res);

    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'Rejected',
        reason: 'Rejected by manager',
      })
    );
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/has been rejected/i),
        data: { reason: 'Rejected by manager' },
      })
    );
  });
});
