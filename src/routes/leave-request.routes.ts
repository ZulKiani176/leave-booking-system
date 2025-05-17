import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getPendingRequestsSummary } from '../controllers/leave-request.controller';
import { getUpcomingTeamLeaves } from '../controllers/leave-request.controller';
import {
  requestLeave,
  cancelLeave,
  getLeaveStatus,
  getRemainingLeave,
  approveLeave,
  rejectLeave,
  getPendingRequests,
  getManagedEmployees,             // ✅ Existing
  getEmployeeLeaveBalance          // ✅ New import
} from '../controllers/leave-request.controller';

const router = Router();

router.get('/ping', (req: Request, res: Response) => {
  res.json({ message: 'pong from leave-requests' });
});

// Submit a leave request
router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  await requestLeave(req, res);
});

// Cancel a leave request
router.delete('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  await cancelLeave(req, res);
});

// View all leave requests for logged-in user
router.get('/status', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  await getLeaveStatus(req, res);
});

// Approve leave request (manager/admin only)
router.patch('/approve', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  await approveLeave(req, res);
});

// Reject leave request (manager/admin only)
router.patch('/reject', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  await rejectLeave(req, res);
});

// View pending requests (manager only)
router.get('/pending', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  await getPendingRequests(req, res);
});

// View employees managed by logged-in manager
router.get('/managed-users', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  await getManagedEmployees(req, res);
});

// ✅ NEW: View remaining leave of a specific employee (manager only)
router.get('/remaining/:userId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  await getEmployeeLeaveBalance(req, res);
});

// View remaining annual leave for logged-in user
router.get('/remaining', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  await getRemainingLeave(req, res);
});

// ✅ NEW: Summary report of pending requests per managed employee
router.get('/reports/pending-summary', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  await getPendingRequestsSummary(req, res);
});

router.get('/reports/upcoming-leaves', authMiddleware, async (req, res) => {
  await getUpcomingTeamLeaves(req, res);
});

export default router;
