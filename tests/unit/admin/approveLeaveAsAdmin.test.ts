
import { approveLeaveAsAdmin } from '../../../src/controllers/admin.controller';
import { AppDataSource } from '../../../src/ormconfig';
import { Request, Response } from 'express';


jest.mock('../../../src/ormconfig', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('approveLeaveAsAdmin (unit, fully mocked)', () => {
  it('approves a pending leave request and deducts days', async () => {
    
    const mockUser = { userId: 1, annualLeaveBalance: 10 };
    const mockLeave = {
      leaveRequestId: 135,
      status: 'Pending',
      startDate: '2025-07-01',
      endDate: '2025-07-03',
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
      params: { leaveRequestId: '135' },
      user: { role: 'admin' },
    } as unknown as Request;

    const jsonMock = jest.fn();
    const res = { json: jsonMock } as unknown as Response;

    
    await approveLeaveAsAdmin(req, res);

    
    expect(findOneMock).toHaveBeenCalledWith({
      where: { leaveRequestId: 135 },
      relations: ['user'],
    });

    
    expect(saveMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ userId: 1, annualLeaveBalance: 7 })
    );

    
    expect(saveMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        status: 'Approved',
        reason: 'Approved by admin',
      })
    );


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
