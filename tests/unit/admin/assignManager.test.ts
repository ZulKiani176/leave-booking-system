
import { Request, Response } from 'express';


const fakeRepo = {
  findOne: jest.fn(),
  create:  jest.fn(),
  save:    jest.fn(),
};


jest.mock('../../../src/ormconfig', () => ({
  AppDataSource: {
    getRepository: () => fakeRepo,
  },
}));

describe('assignManager (unit)', () => {
  
  const { assignManager } = require('../../../src/controllers/admin.controller');

  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock:   jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    jsonMock   = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    res = {
      status: statusMock as any,
      json:   jsonMock,
    };
  });

  it('403 if caller is not admin', async () => {
    req = {
      user: { userId: 99, role: 'employee' },
      body: { employeeId: 1, managerId: 2 },
    };

    await assignManager(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Only admins can assign managers' });
  });

  it('400 if missing employeeId or managerId', async () => {
    req = {
      user: { userId: 1, role: 'admin' },
      body: { managerId: 2 },  
    };

    await assignManager(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Both employeeId and managerId are required' });
  });

  it('404 if employee or manager not found', async () => {
    
    fakeRepo.findOne.mockResolvedValueOnce(null);

    req = {
      user: { userId: 1, role: 'admin' },
      body: { employeeId: 1, managerId: 2 },
    };

    await assignManager(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Employee or manager not found' });
  });

  it('400 if selected user is not a manager', async () => {
    
    fakeRepo.findOne
      .mockResolvedValueOnce({ userId: 1, firstname: 'E', surname: 'E', role: { name: 'employee' } })
      
      .mockResolvedValueOnce({ userId: 2, firstname: 'M', surname: 'M', role: { name: 'employee' } });

    req = {
      user: { userId: 1, role: 'admin' },
      body: { employeeId: 1, managerId: 2 },
    };

    await assignManager(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Selected user is not a manager' });
  });

  it('201 and saves new assignment on success', async () => {
    
    const employeeObj = { userId: 1, firstname: 'E', surname: 'E', role: { name: 'employee' } };
    
    const managerObj  = { userId: 2, firstname: 'M', surname: 'M', role: { name: 'manager' } };

    fakeRepo.findOne
      .mockResolvedValueOnce(employeeObj)    // employee
      .mockResolvedValueOnce(managerObj)     // manager
      .mockResolvedValueOnce(null);          // no existing link

    
    const createdLink = {
      user:      employeeObj,
      manager:   managerObj,
      startDate: new Date('2025-09-01'),
    };
    fakeRepo.create.mockReturnValue(createdLink);
    fakeRepo.save.mockResolvedValue(createdLink);

    req = {
      user: { userId: 1, role: 'admin' },
      body: { employeeId: 1, managerId: 2, startDate: '2025-09-01' },
    };

    await assignManager(req as Request, res as Response);

    
    expect(fakeRepo.create).toHaveBeenCalledWith(createdLink);
    expect(fakeRepo.save).toHaveBeenCalledWith(createdLink);

    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Employee E E assigned to manager M M',
    });
  });
});
