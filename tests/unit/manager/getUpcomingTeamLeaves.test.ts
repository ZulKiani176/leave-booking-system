
import { Request, Response } from 'express'

interface MockRequest extends Partial<Request> {
  user?: {
    userId: number
    role: string
  }
}

const fakeRepo = { find: jest.fn() }

jest.mock('../../../src/ormconfig', () => ({
  AppDataSource: {
    getRepository: () => fakeRepo,
  },
}))

describe('getUpcomingTeamLeaves (unit)', () => {
  const { getUpcomingTeamLeaves } =
    require('../../../src/controllers/leave-request.controller')

  let req: MockRequest
  let res: Partial<Response>
  let statusMock: jest.Mock, jsonMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    jsonMock   = jest.fn()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })
    res = { status: statusMock as any, json: jsonMock }
  })

  it('403 if caller is not manager', async () => {
    req = { user: { userId: 5, role: 'admin' } }
    await getUpcomingTeamLeaves(req as Request, res as Response)
    expect(statusMock).toHaveBeenCalledWith(403)
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Only managers can access upcoming team leaves' })
  })

  it('200 and empty list when no team members', async () => {
    fakeRepo.find.mockResolvedValueOnce([])

    req = { user: { userId: 5, role: 'manager' } }
    await getUpcomingTeamLeaves(req as Request, res as Response)

    expect(jsonMock).toHaveBeenCalledWith({ message: 'No team members found', data: [] })
  })

  it('200 returns upcoming leaves', async () => {
    const managed = [
      { user: { userId: 11, firstname: 'Carl', surname: 'Cole' } },
      { user: { userId: 22, firstname: 'Dana', surname: 'Dane' } },
    ]
    fakeRepo.find
      .mockResolvedValueOnce(managed)  
      .mockResolvedValueOnce([
        {
          user:      { userId: 11, firstname: 'Carl', surname: 'Cole' },
          startDate: '2025-06-15',
          endDate:   '2025-06-20',
        },
        {
          user:      { userId: 22, firstname: 'Dana', surname: 'Dane' },
          startDate: '2025-06-05',
          endDate:   '2025-06-08',
        },
      ]) 

    req = { user: { userId: 5, role: 'manager' } }
    await getUpcomingTeamLeaves(req as Request, res as Response)

    expect(fakeRepo.find).toHaveBeenNthCalledWith(1, {
      where:     { manager: { userId: 5 } },
      relations: ['user'],
    })

    const args = fakeRepo.find.mock.calls[1][0]
    expect(args.relations).toEqual(['user'])
    expect(args.where.status).toBe('Approved')
    
    expect(args.where.user.userId._value).toEqual([11, 22])

    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Upcoming approved leaves within 30 days',
      data: [
        { userId: 11, name: 'Carl Cole', startDate: '2025-06-15', endDate: '2025-06-20' },
        { userId: 22, name: 'Dana Dane', startDate: '2025-06-05', endDate: '2025-06-08' },
      ],
    })
  })
})
