import { Request, Response } from 'express';
import { AppDataSource } from '../ormconfig';
import { User } from '../entities/user';
import { Role } from '../entities/role';
import { logClientError } from '../utils/logger';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const userRepo = AppDataSource.getRepository(User);
const roleRepo = AppDataSource.getRepository(Role);


export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      logClientError(400, 'Missing email or password', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Missing email or password' });
    }

    const user = await userRepo.findOne({
      where: { email },
      relations: ['role'],
    });

    if (!user) {
      logClientError(400, 'Invalid credentials', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // 
    const inputHash = crypto.pbkdf2Sync(password, user.salt, 1000, 64, 'sha512').toString('hex');

    if (inputHash !== user.password) {
      logClientError(400, 'Invalid credentials', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        userId: user.userId,
        role: user.role.name,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    return res.json({ token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
