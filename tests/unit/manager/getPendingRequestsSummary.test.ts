import { Request, Response } from 'express'

const fakeRepo = {
  find: jest.fn(),
  count: jest.fn(),
}


jest.mock('../../../src/ormconfig', () => ({
  AppDataSource: {
    getRepository: () => fakeRepo,
  },
}))


type MockRequest = Partial<Request> & {
  user?: { userId: number; role: string }
}

describe('getPendingRequestsSummary (unit)', () => {
  const { getPendingRequestsSummary } =
    require('../../../src/controllers/leave-request.controller')

  let req: MockRequest
  let res: Partial<Response>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    jsonMock = jest.fn()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })
    res = { status: statusMock as any, json: jsonMock }
  })

  it('403 if caller is not manager', async () => {
    req = { user: { userId: 42, role: 'employee' } }
    await getPendingRequestsSummary(req as Request, res as Response)
    expect(statusMock).toHaveBeenCalledWith(403)
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Only managers can access this report' })
  })

  it('200 returns pending counts per employee', async () => {
    const managed = [
      { user: { userId: 10, firstname: 'Amy', surname: 'Adams' } },
      { user: { userId: 20, firstname: 'Bob', surname: 'Brown' } },
    ]
    fakeRepo.find.mockResolvedValueOnce(managed)
    fakeRepo.count
      .mockResolvedValueOnce(3) 
      .mockResolvedValueOnce(0) 

    req = { user: { userId: 7, role: 'manager' } }

    await getPendingRequestsSummary(req as Request, res as Response)

    expect(fakeRepo.find).toHaveBeenCalledWith({
      where: { manager: { userId: 7 } },
      relations: ['user'],
    })

    expect(fakeRepo.count).toHaveBeenNthCalledWith(1, {
      where: { user: { userId: 10 }, status: 'Pending' },
    })
    expect(fakeRepo.count).toHaveBeenNthCalledWith(2, {
      where: { user: { userId: 20 }, status: 'Pending' },
    })

    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Pending leave requests per employee',
      data: [
        { userId: 10, name: 'Amy Adams', pendingRequests: 3 },
        { userId: 20, name: 'Bob Brown', pendingRequests: 0 },
      ],
    })
  })
})
