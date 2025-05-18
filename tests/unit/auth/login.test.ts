// tests/unit/auth/login.test.ts
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';

// 1) Mock the ORM before importing the controller
const mockUserRepo = { findOne: jest.fn() };
jest.mock('../../../src/ormconfig', () => ({
  AppDataSource: {
    getRepository: jest.fn().mockReturnValue(mockUserRepo),
  },
}));

// 2) Mock jwt.sign
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
}));

// 3) Import after mocks are in place
import { login } from '../../../src/controllers/auth.controller';

describe('login (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function makeReqRes(body: any) {
    const jsonMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    const req = { body } as any as Request;
    const res = { status: statusMock, json: jsonMock } as any as Response;
    return { req, res, statusMock, jsonMock };
  }

  it('400 if missing email or password', async () => {
    let { req, res, statusMock } = makeReqRes({});
    await login(req, res);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(statusMock().json).toHaveBeenCalledWith({ error: 'Missing email or password' });

    ({ req, res, statusMock } = makeReqRes({ email: 'a@b.com' }));
    await login(req, res);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(statusMock().json).toHaveBeenCalledWith({ error: 'Missing email or password' });
  });

  it('400 if user not found', async () => {
    mockUserRepo.findOne.mockResolvedValue(null);
    const { req, res, statusMock } = makeReqRes({ email: 'x@y.com', password: 'pw' });
    await login(req, res);
    expect(mockUserRepo.findOne).toHaveBeenCalledWith({
      where: { email: 'x@y.com' },
      relations: ['role'],
    });
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(statusMock().json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
  });

  it('400 if wrong password', async () => {
    mockUserRepo.findOne.mockResolvedValue({
      userId: 1,
      email: 'x@y.com',
      salt: 'salt',
      password: 'correcthash',
      role: { name: 'employee' },
    });
    // Return an object whose toString('hex') != 'correcthash'
    jest.spyOn(crypto, 'pbkdf2Sync').mockReturnValue({
      toString: (_: string) => 'wronghash',
    } as any);

    const { req, res, statusMock } = makeReqRes({ email: 'x@y.com', password: 'pw' });
    await login(req, res);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(statusMock().json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
  });

  it('200 and returns token on success', async () => {
    mockUserRepo.findOne.mockResolvedValue({
      userId: 1,
      email: 'x@y.com',
      salt: 'salt',
      password: 'correcthash',
      role: { name: 'employee' },
    });
    // Return an object whose toString('hex') === 'correcthash'
    jest.spyOn(crypto, 'pbkdf2Sync').mockReturnValue({
      toString: (_: string) => 'correcthash',
    } as any);
    (jwt.sign as jest.Mock).mockReturnValue('token123');

    const { req, res, jsonMock } = makeReqRes({ email: 'x@y.com', password: 'pw' });
    await login(req, res);

    expect(jsonMock).toHaveBeenCalledWith({ token: 'token123' });
  });
});
