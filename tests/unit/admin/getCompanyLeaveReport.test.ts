import { Request, Response } from 'express'

// fake LeaveRequest repo
const fakeRepo = {
  find: jest.fn(),
}

// mock AppDataSource before importing the controller
jest.mock('../../../src/ormconfig', () => ({
  AppDataSource: {
    getRepository: () => fakeRepo,
  },
}))

describe('getCompanyLeaveSummary (unit)', () => {
  const { getCompanyLeaveSummary } =
    require('../../../src/controllers/admin.controller')
  let req: Partial<Request>
  let res: Partial<Response>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    jsonMock = jest.fn()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })
    res = { status: statusMock as any, json: jsonMock }
    // default to admin
    req = { user: { userId: 1, role: 'admin' } }
  })

  it('403 if caller is not admin', async () => {
    req.user = { userId: 2, role: 'employee' }
    await getCompanyLeaveSummary(req as Request, res as Response)
    expect(statusMock).toHaveBeenCalledWith(403)
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Only admins can access this report' })
  })

  it('200 and returns correct summary', async () => {
    // two approved leaves for two users/depts
    fakeRepo.find.mockResolvedValue([
      {
        leaveRequestId: 10,
        startDate:     '2025-01-01',
        endDate:       '2025-01-03',
        user: {
          userId:    1,
          firstname: 'Alice',
          surname:   'A',
          department:'HR',
        },
      },
      {
        leaveRequestId: 11,
        startDate:     '2025-01-02',
        endDate:       '2025-01-02',
        user: {
          userId:    2,
          firstname: 'Bob',
          surname:   'B',
          department:'Engineering',
        },
      },
    ])

    await getCompanyLeaveSummary(req as Request, res as Response)

    // total requests = 2
    // days: Alice = 3 days (1→3), Bob = 1 day
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Company-wide leave usage summary',
      data: {
        departmentUsage: {
          HR: 3,
          Engineering: 1,
        },
        userUsage: {
          1: { name: 'Alice A', days: 3 },
          2: { name: 'Bob B',   days: 1 },
        },
        totalApprovedRequests: 2,
      },
    })
  })
})
