import { Request, Response } from 'express'
import { AppDataSource }        from '../../../src/ormconfig'
import { UserManagement }      from '../../../src/entities/user-management'
import { getManagedEmployees } from '../../../src/controllers/leave-request.controller'

jest.mock('../../../src/ormconfig', () => ({
  AppDataSource: { getRepository: jest.fn() }
}))

describe('getManagedEmployees()', () => {
  it('should return a JSON list of employees under this manager', async () => {
    
    const fakeFind = jest.fn().mockResolvedValue([
      { user: { userId: 2, firstname: 'Alice', surname: 'Brown' } },
      { user: { userId: 3, firstname: 'Bob',   surname: 'Jones' } }
    ])
    ;(AppDataSource.getRepository as jest.Mock).mockReturnValue({
      find: fakeFind
    })

  
    const req = {
  user: { userId: 1, role: 'manager' }
} as Partial<Request> as Request

    const json = jest.fn()
    const res = { json } as unknown as Response

    
    await getManagedEmployees(req, res)

    
    expect(AppDataSource.getRepository).toHaveBeenCalledWith(UserManagement)
    expect(fakeFind).toHaveBeenCalledWith({
      where: { manager: { userId: 1 } },
      relations: ['user']
    })
    expect(json).toHaveBeenCalledWith({
      message: 'Employees managed by you',
      data: [
        { userId: 2, firstname: 'Alice', surname: 'Brown' },
        { userId: 3, firstname: 'Bob',   surname: 'Jones' }
      ]
    })
  })
})
