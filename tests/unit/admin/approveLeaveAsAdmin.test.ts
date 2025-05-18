// tests/admin/approveLeaveAsAdmin.test.ts
import { approveLeaveAsAdmin } from '../../../src/controllers/admin.controller';
import { AppDataSource } from '../../../src/ormconfig';
import { Request, Response } from 'express';

// 1) Mock the entire AppDataSource so no real DB or metadata is loaded
jest.mock('../../../src/ormconfig', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('approveLeaveAsAdmin (unit, fully mocked)', () => {
  it('approves a pending leave request and deducts days', async () => {
    // 2) Prepare mock data
    const mockUser = { userId: 1, annualLeaveBalance: 10 };
    const mockLeave = {
      leaveRequestId: 135,
      status: 'Pending',
      startDate: '2025-07-01',
      endDate: '2025-07-03',
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
      params: { leaveRequestId: '135' },
      user: { role: 'admin' },
    } as unknown as Request;

    const jsonMock = jest.fn();
    const res = { json: jsonMock } as unknown as Response;

    // 6) Call the controller
    await approveLeaveAsAdmin(req, res);

    // 7) Verify findOne called with numeric ID and relation
    expect(findOneMock).toHaveBeenCalledWith({
      where: { leaveRequestId: 135 },
      relations: ['user'],
    });

    // 8) Expected days = (3 - 1) + 1 = 3
    //    New balance = 10 - 3 = 7
    expect(saveMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ userId: 1, annualLeaveBalance: 7 })
    );

    // 9) Expect leave status update
    expect(saveMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        status: 'Approved',
        reason: 'Approved by admin',
      })
    );

    // 10) Expect JSON response with correct message & data
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/approved by admin/i),
        data: {
          userId: 1,
          daysApproved: 3,
          newBalance: 7,
        },
      })
    );
  });
});
