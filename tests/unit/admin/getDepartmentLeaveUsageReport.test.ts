import { Request, Response } from 'express'

// fake LeaveRequest repo
const fakeRepo = {
  find: jest.fn(),
}

// mock AppDataSource
jest.mock('../../../src/ormconfig', () => ({
  AppDataSource: {
    getRepository: () => fakeRepo,
  },
}))

describe('getDepartmentLeaveUsageReport (unit)', () => {
  const { getDepartmentLeaveUsageReport } =
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
    req = { user: { userId: 1, role: 'admin' } }
  })

  it('403 if not admin', async () => {
    req.user = { userId: 3, role: 'employee' }
    await getDepartmentLeaveUsageReport(req as Request, res as Response)
    expect(statusMock).toHaveBeenCalledWith(403)
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Only admins can view department usage reports' })
  })

  it('200 and maps days by department', async () => {
    fakeRepo.find.mockResolvedValue([
      {
        leaveRequestId: 21,
        startDate:     '2025-02-01',
        endDate:       '2025-02-02',
        user: { department: 'Sales' },
      },
      {
        leaveRequestId: 22,
        startDate:     '2025-02-10',
        endDate:       '2025-02-12',
        user: { department: 'Sales' },
      },
      {
        leaveRequestId: 23,
        startDate:     '2025-02-05',
        endDate:       '2025-02-05',
        user: { department: 'Marketing' },
      },
    ])

    await getDepartmentLeaveUsageReport(req as Request, res as Response)

    // Sales: (2 days)+(3 days)=5, Marketing:1
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Department-wise leave usage',
      data: {
        Sales: 5,
        Marketing: 1,
      },
    })
  })
})
