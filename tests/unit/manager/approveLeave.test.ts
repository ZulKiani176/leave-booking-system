// tests/manager/approveLeave.test.ts
import { approveLeave } from '../../../src/controllers/leave-request.controller';
import { AppDataSource } from '../../../src/ormconfig';

// 1) Mock AppDataSource so no real DB or metadata is touched
jest.mock('../../../src/ormconfig', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('approveLeave (unit, fully mocked)', () => {
  it('approves a valid leave request and updates balance', async () => {
    // 2) Prepare mock data
    const mockUser = { userId: 1, annualLeaveBalance: 10 };
    const mockLeave = {
      leaveRequestId: 123,
      status: 'Pending',
      startDate: '2025-06-01',
      endDate: '2025-06-03',
      user: mockUser,
      reason: '',
    };

    // 3) Stub repository methods
    const findOneMock = jest.fn().mockResolvedValue(mockLeave);
    const saveMock = jest.fn().mockResolvedValue(undefined);

    // 4) getRepository returns our stub for both User and LeaveRequest
    (AppDataSource.getRepository as jest.Mock).mockReturnValue({
      findOne: findOneMock,
      save: saveMock,
    });

    // 5) Fake Express req/res
    const req = {
      body: { leaveRequestId: 123 },
      user: { role: 'manager', userId: 1 },
    } as any;

    const jsonMock = jest.fn();
    const res = { json: jsonMock } as any;

    // 6) Call the controller
    await approveLeave(req, res);

    // 7) Verify findOne was called correctly
    expect(findOneMock).toHaveBeenCalledWith({
      where: { leaveRequestId: 123 },
      relations: ['user'],
    });

    // 8) Calculate expected remaining days: inclusive 3 days → 10 - 3 = 7
    expect(saveMock).toHaveBeenNthCalledWith(1, { userId: 1, annualLeaveBalance: 7 });

    // 9) Expect leave status update
    expect(saveMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ status: 'Approved', reason: 'OK to approve' })
    );

    // 10) Expect JSON response
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/has been approved/i),
        data: { reason: 'OK to approve' },
      })
    );
  });
});
