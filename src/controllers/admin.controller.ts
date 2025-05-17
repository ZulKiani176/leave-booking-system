import { Request, Response } from 'express';
import { AppDataSource } from '../ormconfig';
import { User } from '../entities/user';
import { Role } from '../entities/role';
import { LeaveRequest } from '../entities/leave-request';
import { UserManagement } from '../entities/user-management';
import { logClientError } from '../utils/logger';
import { In } from 'typeorm';
import crypto from 'crypto';

// ✅ Add new staff member (admin only)
export const addNewStaff = async (req: Request, res: Response): Promise<Response> => {
  try {
    const role = req.user?.role;
    if (role !== 'admin') {
      logClientError(403, 'Only admins can add staff', req.originalUrl, req.method, req.user?.userId);
      return res.status(403).json({ error: 'Only admins can add staff' });
    }

    const { firstname, surname, email, password, department, roleId } = req.body;

    if (!firstname || !surname || !email || !password || !department || !roleId) {
      logClientError(400, 'Missing required fields', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const roleRepo = AppDataSource.getRepository(Role);

    const existing = await userRepo.findOne({ where: { email } });
    if (existing) {
      logClientError(400, 'Email already in use', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Email already in use' });
    }

    const roleEntity = await roleRepo.findOne({ where: { roleId } });
    if (!roleEntity) {
      logClientError(400, 'Invalid roleID', req.originalUrl, req.method, req.user?.userId);
      logClientError(400, 'Invalid roleID', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Invalid roleId' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hashedPassword = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');

    const newUser = userRepo.create({
      firstname,
      surname,
      email,
      department,
      password: hashedPassword,
      salt,
      role: roleEntity,
    });

    await userRepo.save(newUser);

    return res.status(201).json({
      message: 'Staff member added',
      data: { id: newUser.userId, email: newUser.email },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ✅ Update user role (admin only)
export const updateUserRole = async (req: Request, res: Response): Promise<Response> => {
  try {
    const adminRole = req.user?.role;
    if (adminRole !== 'admin') {
      logClientError(403, 'Only admins can update roles', req.originalUrl, req.method, req.user?.userId);
      return res.status(403).json({ error: 'Only admins can update roles' });
    }

    const userId = parseInt(req.params.userId, 10);
    const { roleId } = req.body;

    if (!roleId) return res.status(400).json({ error: 'New roleId is required' });

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { userId } });

    if (!user) return res.status(404).json({ error: 'User not found' });

    user.role = { roleId } as any;
    await userRepo.save(user);

    return res.json({ message: `Role updated for user ${userId}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ✅ Update user department (admin only)
export const updateUserDepartment = async (req: Request, res: Response): Promise<Response> => {
  try {
    const adminRole = req.user?.role;
    if (adminRole !== 'admin') {
      logClientError(403, 'Only admins can update departments', req.originalUrl, req.method, req.user?.userId);
      return res.status(403).json({ error: 'Only admins can update departments' });
    }

    const userId = parseInt(req.params.userId, 10);
    const { department } = req.body;

    if (!department) return res.status(400).json({ error: 'New department is required' });

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { userId } });

    if (!user) return res.status(404).json({ error: 'User not found' });

    user.department = department;
    await userRepo.save(user);

    return res.json({ message: `Department updated for user ${userId}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ✅ View all users (admin only)
export const getAllUsers = async (req: Request, res: Response): Promise<Response> => {
  try {
    const role = req.user?.role;
    if (role !== 'admin') {
      logClientError(403, 'Only admins can view all users', req.originalUrl, req.method, req.user?.userId);
      return res.status(403).json({ error: 'Only admins can view all users' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const users = await userRepo.find({ relations: ['role'] });

    const data = users.map(user => ({
      userId: user.userId,
      firstname: user.firstname,
      surname: user.surname,
      email: user.email,
      department: user.department,
      role: user.role.name,
      annualLeaveBalance: user.annualLeaveBalance
    }));

    return res.json({ message: 'All users in the system', data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ✅ View all leave requests with optional filters (admin only)
export const getAllLeaveRequests = async (req: Request, res: Response): Promise<Response> => {
  try {
    const role = req.user?.role;
    if (role !== 'admin') {
      logClientError(403, 'Only admins can view all leave requests', req.originalUrl, req.method, req.user?.userId);
      return res.status(403).json({ error: 'Only admins can view all leave requests' });
    }

    const { userId, managerId } = req.query;
    const leaveRepo = AppDataSource.getRepository(LeaveRequest);
    const managementRepo = AppDataSource.getRepository(UserManagement);

    let whereCondition: any = {};

    if (userId) {
      whereCondition.user = { userId: parseInt(userId as string, 10) };
    }

    if (managerId) {
      const managed = await managementRepo.find({
        where: { manager: { userId: parseInt(managerId as string, 10) } },
        relations: ['user']
      });

      const ids = managed.map(entry => entry.user.userId);
      if (ids.length === 0) {
        return res.json({ message: 'No users managed by this manager', data: [] });
      }

      whereCondition.user = { userId: In(ids) };
    }

    const results = await leaveRepo.find({
      where: { ...whereCondition, status: 'Pending' },
      relations: ['user']
    });

    const data = results.map(lr => ({
      requestId: lr.leaveRequestId,
      userId: lr.user.userId,
      name: `${lr.user.firstname} ${lr.user.surname}`,
      startDate: lr.startDate,
      endDate: lr.endDate,
      status: lr.status,
      reason: lr.reason || null
    }));

    return res.json({ message: 'Leave requests', data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ✅ Approve a leave request (admin only)
export const approveLeaveAsAdmin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const role = req.user?.role;
    if (role !== 'admin') {
      logClientError(403, 'Only admins can approve leave requests', req.originalUrl, req.method, req.user?.userId);
      return res.status(403).json({ error: 'Only admins can approve leave requests' });
    }

    const leaveRequestId = parseInt(req.params.leaveRequestId, 10);
    if (!leaveRequestId) {
      logClientError(400, 'Invalid leaveRequestId', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Invalid leaveRequestId' });
    }

    const leaveRepo = AppDataSource.getRepository(LeaveRequest);
    const userRepo = AppDataSource.getRepository(User);

    const leave = await leaveRepo.findOne({ where: { leaveRequestId }, relations: ['user'] });

    if (!leave) {
      logClientError(404, 'Leave request not found', req.originalUrl, req.method, req.user?.userId);
      return res.status(404).json({ error: 'Leave request not found' });
    }

    if (leave.status !== 'Pending') {
      logClientError(400, 'Only pending requests can be approved', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Only pending requests can be approved' });
    }

    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;

    if (leave.user.annualLeaveBalance < days) {
      return res.status(400).json({ error: 'User does not have enough leave balance' });
    }

    leave.user.annualLeaveBalance -= days;
    leave.status = 'Approved';
    leave.reason = 'Approved by admin';

    await userRepo.save(leave.user);
    await leaveRepo.save(leave);

    return res.json({
      message: `Leave request ${leave.leaveRequestId} approved by admin.`,
      data: {
        userId: leave.user.userId,
        daysApproved: days,
        newBalance: leave.user.annualLeaveBalance,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ✅ Leave usage statistics (admin only)
export const getLeaveUsageStatistics = async (req: Request, res: Response): Promise<Response> => {
  try {
    const role = req.user?.role;
    if (role !== 'admin') {
      logClientError(403, 'Only admins can view leave usage statistics', req.originalUrl, req.method, req.user?.userId);
      return res.status(403).json({ error: 'Only admins can view leave usage statistics' });
    }

    const leaveRepo = AppDataSource.getRepository(LeaveRequest);

    const approvedLeaves = await leaveRepo.find({
      where: { status: 'Approved' },
      relations: ['user'],
    });

    const totalApprovedRequests = approvedLeaves.length;
    const totalLeaveDays = approvedLeaves.reduce((sum, leave) => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;
      return sum + days;
    }, 0);

    const departmentLeaveDays: { [key: string]: number } = {};
    const userLeaveDays: { [key: string]: number } = {};

    approvedLeaves.forEach((leave) => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;
      const department = leave.user.department;
      const userName = `${leave.user.firstname} ${leave.user.surname}`;

      departmentLeaveDays[department] = (departmentLeaveDays[department] || 0) + days;
      userLeaveDays[userName] = (userLeaveDays[userName] || 0) + days;
    });

    return res.json({
      totalApprovedRequests,
      totalLeaveDays,
      departmentLeaveDays,
      userLeaveDays,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ✅ Update annual leave balance (admin only)
export const updateAnnualLeaveBalance = async (req: Request, res: Response): Promise<Response> => {
  try {
    const adminRole = req.user?.role;
    if (adminRole !== 'admin') {
      logClientError(403, 'Only admins can update leave balances', req.originalUrl, req.method, req.user?.userId);
      return res.status(403).json({ error: 'Only admins can update leave balances' });
    }

    const userId = parseInt(req.params.userId, 10);
    const { balance } = req.body;

    if (isNaN(balance) || balance < 0) {
      logClientError(400, 'Invalid balance value', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Invalid balance value' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { userId } });

    if (!user) {
      logClientError(404, 'User not found', req.originalUrl, req.method, req.user?.userId);
      return res.status(404).json({ error: 'User not found' });
    }

    user.annualLeaveBalance = balance;
    await userRepo.save(user);

    return res.json({ message: `Annual leave balance updated to ${balance} for user ${userId}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ✅ Assign a manager to an employee (admin only)
export const assignManager = async (req: Request, res: Response): Promise<Response> => {
  try {
    const role = req.user?.role;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can assign managers' });
    }

    const { employeeId, managerId, startDate } = req.body;

    if (!employeeId || !managerId) {
      logClientError(400, 'Both employeeId and managerId are required', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Both employeeId and managerId are required' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const managementRepo = AppDataSource.getRepository(UserManagement);

    const employee = await userRepo.findOne({ where: { userId: employeeId }, relations: ['role'] });
    const manager = await userRepo.findOne({ where: { userId: managerId }, relations: ['role'] });

    if (!employee || !manager) {
      logClientError(404, 'Employee or manager not found', req.originalUrl, req.method, req.user?.userId);
      return res.status(404).json({ error: 'Employee or manager not found' });
    }

    if (manager.role.name !== 'manager') {
      logClientError(400, 'Selected user is not a manager', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Selected user is not a manager' });
    }

    const existing = await managementRepo.findOne({ where: { user: { userId: employeeId } } });
    if (existing) {
      logClientError(400, 'This employee is already assigned to a manager', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'This employee is already assigned to a manager' });
    }

    const newLink = managementRepo.create({
      user: employee,
      manager,
      startDate: startDate ? new Date(startDate) : new Date(),
    });

    await managementRepo.save(newLink);

    return res.status(201).json({
      message: `Employee ${employee.firstname} ${employee.surname} assigned to manager ${manager.firstname} ${manager.surname}`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ✅ Company Leave Summary (admin only)
export const getCompanyLeaveSummary = async (req: Request, res: Response): Promise<Response> => {
  try {
    const role = req.user?.role;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can access this report' });
    }

    const leaveRepo = AppDataSource.getRepository(LeaveRequest);
    const approvedLeaves = await leaveRepo.find({
      where: { status: 'Approved' },
      relations: ['user'],
    });

    const departmentUsage: { [dept: string]: number } = {};
    const userUsage: { [userId: number]: { name: string; days: number } } = {};

    for (const leave of approvedLeaves) {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;

      const dept = leave.user.department;
      const userId = leave.user.userId;
      const name = `${leave.user.firstname} ${leave.user.surname}`;

      departmentUsage[dept] = (departmentUsage[dept] || 0) + days;
      userUsage[userId] = {
        name,
        days: (userUsage[userId]?.days || 0) + days,
      };
    }

    return res.json({
      message: 'Company-wide leave usage summary',
      data: {
        departmentUsage,
        userUsage,
        totalApprovedRequests: approvedLeaves.length,
      },
    });
  } catch (err) {
    console.error('Company Summary Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ✅ Department-level leave usage summary (admin only)
export const getDepartmentLeaveUsageReport = async (req: Request, res: Response): Promise<Response> => {
  try {
    const role = req.user?.role;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can view department usage reports' });
    }

    const leaveRepo = AppDataSource.getRepository(LeaveRequest);
    const approvedLeaves = await leaveRepo.find({
      where: { status: 'Approved' },
      relations: ['user'],
    });

    const departmentUsage: { [department: string]: number } = {};

    for (const leave of approvedLeaves) {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;

      const dept = leave.user.department;
      departmentUsage[dept] = (departmentUsage[dept] || 0) + days;
    }

    return res.json({
      message: 'Department-wise leave usage',
      data: departmentUsage,
    });
  } catch (err) {
    console.error('Department Leave Usage Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

