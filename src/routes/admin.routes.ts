import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getCompanyLeaveSummary } from '../controllers/admin.controller';
import { getDepartmentLeaveUsageReport } from '../controllers/admin.controller';
import {
  addNewStaff,
  updateUserRole,
  updateUserDepartment,
  getAllUsers,
  getAllLeaveRequests,
  approveLeaveAsAdmin,
  getLeaveUsageStatistics,
  updateAnnualLeaveBalance,
  assignManager,
} from '../controllers/admin.controller';

const router = Router();

// Ping check
router.get('/ping', (req: Request, res: Response) => {
  res.json({ message: 'pong from admin' });
});

//  Add new staff
router.post('/add-user', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  await addNewStaff(req, res);
});

//  Update role
router.patch('/update-role/:userId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  await updateUserRole(req, res);
});

//  Update department
router.patch('/update-department/:userId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  await updateUserDepartment(req, res);
});

//  View all users
router.get('/all-users', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  await getAllUsers(req, res);
});

//  View all leave requests (admin only, with optional filters)
router.get('/all-leave-requests', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  await getAllLeaveRequests(req, res);
});

//  Approve leave request as admin
router.patch('/approve/:leaveRequestId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  await approveLeaveAsAdmin(req, res);
});

//  Get leave usage statistics
router.get('/leave-usage-stats', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  await getLeaveUsageStatistics(req, res);
});

//  Update annual leave balance for a user
router.patch('/update-leave-balance/:userId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  await updateAnnualLeaveBalance(req, res);
});

//  Assign manager to employee
router.post('/assign-manager', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  await assignManager(req, res);
});

// Company summary report (admin only)
router.get('/reports/company-summary', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  await getCompanyLeaveSummary(req, res);
});

// Department usage report
router.get('/reports/department-usage', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  await getDepartmentLeaveUsageReport(req, res);
});


export default router;
