
import { addNewStaff } from '../../../src/controllers/admin.controller';
import { AppDataSource } from '../../../src/ormconfig';
import { User } from '../../../src/entities/user';
import { Role } from '../../../src/entities/role';
import { Request, Response } from 'express';


jest.mock('../../../src/ormconfig', () => ({
  AppDataSource: { getRepository: jest.fn() },
}));

describe('addNewStaff (unit)', () => {
  const getRepo = AppDataSource.getRepository as jest.Mock;
  let userRepo: any;
  let roleRepo: any;

  beforeEach(() => {
    jest.resetAllMocks();

    userRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    roleRepo = {
      findOne: jest.fn(),
    };

    getRepo.mockImplementation((entity) => {
      if (entity === User) return userRepo;
      if (entity === Role) return roleRepo;
      throw new Error('Unexpected entity');
    });
  });

  it('403 if caller is not admin', async () => {
    const req = { user: { role: 'manager' } } as any as Request;
    const statusMock = jest.fn().mockReturnValue({ json: jest.fn() });
    const res = { status: statusMock } as any as Response;

    await addNewStaff(req, res);
    expect(statusMock).toHaveBeenCalledWith(403);
  });

  it('400 if missing required fields', async () => {
    const req = { user: { role: 'admin' }, body: { firstname: 'A' } } as any as Request;
    const statusMock = jest.fn().mockReturnValue({ json: jest.fn() });
    const res = { status: statusMock } as any as Response;

    await addNewStaff(req, res);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(statusMock().json).toHaveBeenCalledWith({ error: 'Missing required fields' });
  });

  it('400 if email already in use', async () => {
    userRepo.findOne.mockResolvedValue({ userId: 99 }); 
    const req = {
      user: { role: 'admin' },
      body: {
        firstname: 'A',
        surname: 'B',
        email: 'x@y.com',
        password: 'pass',
        department: 'D',
        roleId: 1,
      },
    } as any as Request;
    const statusMock = jest.fn().mockReturnValue({ json: jest.fn() });
    const res = { status: statusMock } as any as Response;

    await addNewStaff(req, res);
    expect(userRepo.findOne).toHaveBeenCalledWith({ where: { email: 'x@y.com' } });
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(statusMock().json).toHaveBeenCalledWith({ error: 'Email already in use' });
  });

  it('400 if roleId invalid', async () => {
    userRepo.findOne.mockResolvedValue(null);
    roleRepo.findOne.mockResolvedValue(null); 
    const req = {
      user: { role: 'admin' },
      body: {
        firstname: 'A',
        surname: 'B',
        email: 'u@v.com',
        password: 'pw',
        department: 'D',
        roleId: 42,
      },
    } as any as Request;
    const statusMock = jest.fn().mockReturnValue({ json: jest.fn() });
    const res = { status: statusMock } as any as Response;

    await addNewStaff(req, res);
    expect(roleRepo.findOne).toHaveBeenCalledWith({ where: { roleId: 42 } });
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(statusMock().json).toHaveBeenCalledWith({ error: 'Invalid roleId' });
  });

  it('201 and returns new user id/email on success', async () => {
    userRepo.findOne.mockResolvedValue(null);
    roleRepo.findOne.mockResolvedValue({ roleId: 2, name: 'employee' });

    const fakeUser = { userId: 55, email: 'new@e.com' };
    userRepo.create.mockReturnValue(fakeUser);
    userRepo.save.mockResolvedValue(fakeUser);

    const req = {
      user: { role: 'admin' },
      body: {
        firstname: 'F',
        surname: 'L',
        email: 'new@e.com',
        password: 'secret',
        department: 'IT',
        roleId: 2,
      },
    } as any as Request;
    const jsonMock = jest.fn();
    const res = { status: jest.fn().mockReturnValue({ json: jsonMock }) } as any as Response;

    await addNewStaff(req, res);

    expect(userRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        firstname: 'F',
        surname: 'L',
        email: 'new@e.com',
        department: 'IT',
        role: expect.objectContaining({ roleId: 2 }),
      })
    );
    expect(userRepo.save).toHaveBeenCalledWith(fakeUser);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Staff member added',
      data: { id: 55, email: 'new@e.com' },
    });
  });
});
