
import { approveLeave } from '../../../src/controllers/leave-request.controller';
import { AppDataSource } from '../../../src/ormconfig';


jest.mock('../../../src/ormconfig', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('approveLeave (unit, fully mocked)', () => {
  it('approves a valid leave request and updates balance', async () => {
    
    const mockUser = { userId: 1, annualLeaveBalance: 10 };
    const mockLeave = {
      leaveRequestId: 123,
      status: 'Pending',
      startDate: '2025-06-01',
      endDate: '2025-06-03',
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
      body: { leaveRequestId: 123 },
      user: { role: 'manager', userId: 1 },
    } as any;

    const jsonMock = jest.fn();
    const res = { json: jsonMock } as any;

    
    await approveLeave(req, res);

    
    expect(findOneMock).toHaveBeenCalledWith({
      where: { leaveRequestId: 123 },
      relations: ['user'],
    });

    
    expect(saveMock).toHaveBeenNthCalledWith(1, { userId: 1, annualLeaveBalance: 7 });

   
    expect(saveMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ status: 'Approved', reason: 'OK to approve' })
    );

    
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/has been approved/i),
        data: { reason: 'OK to approve' },
      })
    );
  });
});
