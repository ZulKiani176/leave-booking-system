
import { Request, Response } from 'express'


const fakeRepo = { find: jest.fn() }


jest.mock('../../../src/ormconfig', () => ({
  AppDataSource: {
    getRepository: () => fakeRepo,
  },
}))

describe('getAllLeaveRequests (unit)', () => {
  const { getAllLeaveRequests } =
    require('../../../src/controllers/admin.controller')
  let req: Partial<Request>
  let res: Partial<Response>
  let statusMock: jest.Mock
  let jsonMock:   jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    jsonMock   = jest.fn()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })
    res = { status: statusMock as any, json: jsonMock }
    req = { user: { userId: 1, role: 'admin' }, query: {} }
  })

  it('403 if caller is not admin', async () => {
    req.user = { userId: 2, role: 'employee' }
    await getAllLeaveRequests(req as Request, res as Response)
    expect(statusMock).toHaveBeenCalledWith(403)
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Only admins can view all leave requests' })
  })

  it('200 returns pending leave requests', async () => {
    fakeRepo.find.mockResolvedValue([
      {
        leaveRequestId: 1,
        startDate:     '2025-06-01',
        endDate:       '2025-06-02',
        status:        'Pending',
        reason:        'Vacation',
        user: {
          userId:    3,
          firstname: 'John',
          surname:   'Doe',
        },
      },
    ])

    await getAllLeaveRequests(req as Request, res as Response)

    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Leave requests',
      data: [
        {
          requestId: 1,
          userId:    3,
          name:      'John Doe',
          startDate: '2025-06-01',
          endDate:   '2025-06-02',
          status:    'Pending',
          reason:    'Vacation',
        },
      ],
    })
  })

  it('200 filtered by userId query', async () => {
    req.query = { userId: '3' }
    fakeRepo.find.mockResolvedValue([
      {
        leaveRequestId: 2,
        startDate:     '2025-07-01',
        endDate:       '2025-07-01',
        status:        'Pending',
        reason:        null,
        user: {
          userId:    3,
          firstname: 'John',
          surname:   'Doe',
        },
      },
    ])

    await getAllLeaveRequests(req as Request, res as Response)

    expect(fakeRepo.find).toHaveBeenCalledWith({
      where:     { user: { userId: 3 }, status: 'Pending' },
      relations: ['user'],
    })
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Leave requests',
      data: [
        {
          requestId: 2,
          userId:    3,
          name:      'John Doe',
          startDate: '2025-07-01',
          endDate:   '2025-07-01',
          status:    'Pending',
          reason:    null,
        },
      ],
    })
  })

  it('200 when managerId filter but no managed users', async () => {
    req.query = { managerId: '5' }
    fakeRepo.find.mockResolvedValueOnce([])

    await getAllLeaveRequests(req as Request, res as Response)

    expect(jsonMock).toHaveBeenCalledWith({
      message: 'No users managed by this manager',
      data:    [],
    })
  })

  it('200 filtered by managerId query', async () => {
    req.query = { managerId: '5' }
    fakeRepo.find
      
      .mockResolvedValueOnce([{ user: { userId: 10 } }])
      
      .mockResolvedValueOnce([
        {
          leaveRequestId: 3,
          startDate:     '2025-08-01',
          endDate:       '2025-08-03',
          status:        'Pending',
          reason:        'Sick',
          user: {
            userId:    10,
            firstname: 'Jane',
            surname:   'Roe',
          },
        },
      ])

    await getAllLeaveRequests(req as Request, res as Response)

    
    expect(fakeRepo.find).toHaveBeenNthCalledWith(1, {
      where:     { manager: { userId: 5 } },
      relations: ['user'],
    })

    
    const secondArgs = fakeRepo.find.mock.calls[1][0]
    expect(secondArgs.relations).toEqual(['user'])
    expect(secondArgs.where.status).toBe('Pending')
    
    expect(secondArgs.where.user.userId._value).toEqual([10])

    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Leave requests',
      data: [
        {
          requestId: 3,
          userId:    10,
          name:      'Jane Roe',
          startDate: '2025-08-01',
          endDate:   '2025-08-03',
          status:    'Pending',
          reason:    'Sick',
        },
      ],
    })
  })
})
