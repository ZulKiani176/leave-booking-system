import { Router, Request, Response } from 'express';
import { login } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

//register route
//router.post('/register', async (req: Request, res: Response): Promise<void> => {
  //await register(req, res);
//});

// Login route
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  await login(req, res);
});

// Ping route
router.get('/ping', (req: Request, res: Response): void => {
  res.json({ message: 'pong' });
});

// authenticate user
router.get('/protected', authMiddleware, (req: Request, res: Response): void => {
  res.json({
    message: `Hello user ${req.user?.userId}, your role is ${req.user?.role}`,
  });
});

// Admin-only route
router.get(
  '/admin-only',
  authMiddleware,
  requireRole('admin'),
  (req: Request, res: Response): void => {
    res.json({ message: 'You are an admin' });
  }
);

export default router;
