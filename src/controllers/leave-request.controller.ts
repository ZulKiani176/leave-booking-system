import { Request, Response } from 'express';
import { AppDataSource } from '../ormconfig';
import { LeaveRequest } from '../entities/leave-request';
import { User } from '../entities/user';
import { UserManagement } from '../entities/user-management';
import { logClientError } from '../utils/logger';
import { AdminUser, ManagerUser } from '../models/base-user';
import { AnnualLeave, SickLeave, LeaveType } from '../models/leave-types';
import { Between } from 'typeorm';
import { In } from 'typeorm';


export const requestLeave = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { startDate, endDate } = req.body;
    const userId = req.user?.userId;

    if (!userId) return res.status(400).json({ error: 'Invalid employee ID' });
    if (!startDate || !endDate)
      return res.status(400).json({ error: 'Start and end dates required' });

    const start = new Date(startDate);
    const end = new Date(endDate);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      logClientError(400, 'Invalid date format', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Invalid date format' });
    }

    if (start < now) {
      logClientError(400, 'Cannot request leave in the past', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Cannot request leave in the past' });
    }
  

    if (end <= start) {
      logClientError(400, 'End date is before Start date', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({
        error: `End date of ${endDate} is before the start date of ${startDate}`,
      });
    }

    const userRepo = AppDataSource.getRepository(User);
    const leaveRepo = AppDataSource.getRepository(LeaveRequest);

    const user = await userRepo.findOne({ where: { userId } });
    if (!user) return res.status(400).json({ error: 'Invalid employee ID' });

    const daysRequested =
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;

    if (daysRequested > user.annualLeaveBalance) {
      logClientError(400, 'Day requested exceed remaining balance', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Days requested exceed remaining balance' });
    }

    const overlapping = await leaveRepo.findOne({
      where: {
        user: { userId },
        startDate: Between(startDate, endDate),
      },
    });

    if (overlapping) {
      return res
        .status(400)
        .json({ error: 'Date range of request overlaps with existing request' });
    }

    const requestedType = req.body.leaveType || 'Annual Leave';

let leaveTypeObj: LeaveType;
switch (requestedType) {
  case 'Sick Leave':
    leaveTypeObj = new SickLeave();
    break;
  case 'Annual Leave':
  default:
    leaveTypeObj = new AnnualLeave();
    break;
} 

const leave = leaveRepo.create({
  user,
  leaveType: leaveTypeObj.name, // Annual Leave
  startDate,
  endDate,
  status: 'Pending',
  reason: leaveTypeObj.getPolicyNote(),
});


    await leaveRepo.save(leave);

    return res.status(201).json({
      message: 'Leave request has been submitted for review',
      data: {
        id: leave.leaveRequestId,
        employee_id: user.userId,
        start_date: startDate,
        end_date: endDate,
        status: leave.status,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const cancelLeave = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { leaveRequestId } = req.body;
    const userId = req.user?.userId;
    const role = req.user?.role;

    if (!leaveRequestId) {
      logClientError(400, 'Invalid leave request ID', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Invalid leave request ID' });
    }

    const leaveRepo = AppDataSource.getRepository(LeaveRequest);
    const userRepo = AppDataSource.getRepository(User);

    const leave = await leaveRepo.findOne({
      where: { leaveRequestId },
      relations: ['user'],
    });

    if (!leave) {
      logClientError(400, 'Invalid leave request ID', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Invalid leave request ID' });
    }

    const isOwner = leave.user.userId === userId;
    const isAdmin = role === 'admin';

    if (!isOwner && !isAdmin) {
      logClientError(403, 'Unauthorised to cancel this request', req.originalUrl, req.method, req.user?.userId);
      return res.status(403).json({ error: 'Unauthorised to cancel this request' });
    }

    if (leave.status === 'Cancelled') {
      logClientError(400, 'Leave request already cancelled', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Leave request already cancelled' });
    }

    if (leave.status === 'Approved') {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;

      leave.user.annualLeaveBalance += days;
      await userRepo.save(leave.user);
    }

    leave.status = 'Cancelled';
    leave.reason = 'Cancelled by user or admin';
    await leaveRepo.save(leave);

    return res.json({
      message: 'Leave request has been cancelled',
      reason: leave.reason,
      data: {
        id: leave.leaveRequestId,
        employee_id: leave.user.userId,
        start_date: leave.startDate,
        end_date: leave.endDate,
        status: leave.status,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLeaveStatus = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      logClientError(400, 'Invalid employee ID', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Invalid employee ID' });
    }

    const leaveRepo = AppDataSource.getRepository(LeaveRequest);

    const requests = await leaveRepo.find({
      where: { user: { userId } },
      order: { startDate: 'ASC' },
    });

    const formatted = requests.map((r) => ({
      id: r.leaveRequestId,
      start_date: r.startDate,
      end_date: r.endDate,
      status: r.status,
      reason: r.reason || null
    }));

    return res.json({
      message: `Status of leave requests for employee_id ${userId}`,
      data: formatted,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRemainingLeave = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      logClientError(400, 'Invalid employee ID', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Invalid employee ID' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { userId } });

    if (!user) {
      logClientError(400, 'Invalid employee ID', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Invalid employee ID' });
    }

    return res.json({
      message: `Status of leave requests for employee_id ${userId}`,
      data: {
        'days remaining': user.annualLeaveBalance,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const approveLeave = async (req: Request, res: Response): Promise<Response> => {
  try {
    const role = req.user?.role;
    if (role !== 'manager' && role !== 'admin') {
      logClientError(403, 'Only managers or admins can approve leave', req.originalUrl, req.method, req.user?.userId);
      return res.status(403).json({ error: 'Only managers or admins can approve leave' });
    }

    const { leaveRequestId } = req.body;
    if (!leaveRequestId) {
      logClientError(400, 'Invalid leave request ID', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Invalid leave request ID' });
    }

    const leaveRepo = AppDataSource.getRepository(LeaveRequest);
    const userRepo = AppDataSource.getRepository(User);

    const leave = await leaveRepo.findOne({
      where: { leaveRequestId },
      relations: ['user'],
    });

    if (!leave) {
      logClientError(400, 'Invalid leave request ID', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Invalid leave request ID' });
    }

    // polymorphic user logic
let logicUser;
if (role === 'admin') {
  logicUser = new AdminUser(leave.user);
} else {
  logicUser = new ManagerUser(leave.user);
}
console.log('Approver:', logicUser.getFullName(), '| Privileges:', logicUser.getPrivileges());


    if (leave.status !== 'Pending') {
      logClientError(400, 'Only pending requests can be approved', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Only pending requests can be approved' });
    }

    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;

    if (leave.user.annualLeaveBalance < days) {
      logClientError(400, 'User does not have enough leave balance', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'User does not have enough leave balance' });
    }

    leave.user.annualLeaveBalance -= days;
    leave.status = 'Approved';
    leave.reason = 'OK to approve';

    await userRepo.save(leave.user);
    await leaveRepo.save(leave);

    return res.json({
      message: `Leave request ${leave.leaveRequestId} for employee_id ${leave.user.userId} has been approved`,
      data: {
        reason: leave.reason,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPendingRequests = async (req: Request, res: Response): Promise<Response> => {
  try {
    const managerId = req.user?.userId;
    const role = req.user?.role;

    if (!managerId || role !== 'manager') {
      logClientError(403, 'Only managers can view pending leave requests', req.originalUrl, req.method, req.user?.userId);
      return res.status(403).json({ error: 'Only managers can view pending leave requests' });
    }

    const managementRepo = AppDataSource.getRepository(UserManagement);
    const leaveRepo = AppDataSource.getRepository(LeaveRequest);

    const managedUsers = await managementRepo.find({
      where: { manager: { userId: managerId } },
      relations: ['user'],
    });

    const userIds = managedUsers.map(record => record.user.userId);

    if (userIds.length === 0) {
      return res.json({ message: 'No pending leave requests found', data: [] });
    }

    const pendingRequests = await leaveRepo.find({
      where: userIds.map(id => ({
        user: { userId: id },
        status: 'Pending'
      })),
      relations: ['user'],
    });

    const formatted = pendingRequests.map(req => ({
      request_id: req.leaveRequestId,
      employee_id: req.user.userId,
      name: `${req.user.firstname} ${req.user.surname}`,
      start_date: req.startDate,
      end_date: req.endDate,
      status: req.status
    }));

    return res.json({
      message: 'Pending leave requests for your managed employees',
      data: formatted,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const rejectLeave = async (req: Request, res: Response): Promise<Response> => {
  try {
    const role = req.user?.role;
    if (role !== 'manager' && role !== 'admin') {
      logClientError(403, 'Only managers or admins can reject leave', req.originalUrl, req.method, req.user?.userId);
      return res.status(403).json({ error: 'Only managers or admins can reject leave' });
    }

    const { leaveRequestId, reason } = req.body;

    if (!leaveRequestId) {
      logClientError(400, 'Invalid leave request ID', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Invalid leave request ID' });
    }

    const leaveRepo = AppDataSource.getRepository(LeaveRequest);

    const leave = await leaveRepo.findOne({
      where: { leaveRequestId },
      relations: ['user'],
    });

    if (!leave) {
      logClientError(400, 'Invalid leave request ID', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Invalid leave request ID' });
    }

    if (leave.status !== 'Pending') {
      logClientError(400, 'Only pending requests can be rejected', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Only pending requests can be rejected' });
    }

    leave.status = 'Rejected';
    leave.reason = reason || 'Rejected by manager';

    await leaveRepo.save(leave);

    return res.json({
      message: `Leave request ${leave.leaveRequestId} for employee_id ${leave.user.userId} has been rejected`,
      data: {
        reason: leave.reason,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// NEW: View all managed employees for a manager
export const getManagedEmployees = async (req: Request, res: Response): Promise<Response> => {
  try {
    const managerId = req.user?.userId;
    const role = req.user?.role;

    if (!managerId || role !== 'manager') {
      logClientError(403, 'Only managers can view their managed employees', req.originalUrl, req.method, req.user?.userId);
      return res.status(403).json({ error: 'Only managers can view their managed employees' });
    }

    const managementRepo = AppDataSource.getRepository(UserManagement);

    const managedUsers = await managementRepo.find({
      where: { manager: { userId: managerId } },
      relations: ['user'],
    });

    const data = managedUsers.map(entry => ({
      userId: entry.user.userId,
      firstname: entry.user.firstname,
      surname: entry.user.surname,
    }));

    return res.json({
      message: 'Employees managed by you',
      data,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// NEW: Manager can view specific employee's leave balance
export const getEmployeeLeaveBalance = async (req: Request, res: Response): Promise<Response> => {
  try {
    const managerId = req.user?.userId;
    const role = req.user?.role;
    const employeeId = parseInt(req.params.userId, 10);

    if (!managerId || role !== 'manager') {
      logClientError(403, 'Only managers can view employee leave balance', req.originalUrl, req.method, req.user?.userId);
      return res.status(403).json({ error: 'Only managers can view employee leave balance' });
    }

    if (!employeeId) {
      logClientError(400, 'Invalid employee ID', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Invalid employee ID' });
    }

    const managementRepo = AppDataSource.getRepository(UserManagement);
    const isManaged = await managementRepo.findOne({
      where: {
        manager: { userId: managerId },
        user: { userId: employeeId },
      },
    });

    if (!isManaged) {
      logClientError(403, 'You do not manage this employee', req.originalUrl, req.method, req.user?.userId);
      return res.status(403).json({ error: 'You do not manage this employee' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { userId: employeeId } });

    if (!user) {
      logClientError(400, 'Employee not found', req.originalUrl, req.method, req.user?.userId);
      return res.status(400).json({ error: 'Employee not found' });
    }

    return res.json({
      message: `Annual leave balance for employee_id ${employeeId}`,
      data: {
        userId: user.userId,
    firstname: user.firstname,
    surname: user.surname,
        'days remaining': user.annualLeaveBalance,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


// Pending Request Overview Report
export const getPendingRequestsSummary = async (req: Request, res: Response): Promise<Response> => {
  try {
    const managerId = req.user?.userId;
    const role = req.user?.role;

    if (!managerId || role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can access this report' });
    }

    const managementRepo = AppDataSource.getRepository(UserManagement);
    const leaveRepo = AppDataSource.getRepository(LeaveRequest);

    const managed = await managementRepo.find({
      where: { manager: { userId: managerId } },
      relations: ['user'],
    });

    const summary = await Promise.all(
      managed.map(async (entry) => {
        const count = await leaveRepo.count({
          where: { user: { userId: entry.user.userId }, status: 'Pending' },
        });
        return {
          userId: entry.user.userId,
          name: `${entry.user.firstname} ${entry.user.surname}`,
          pendingRequests: count,
        };
      })
    );

    return res.json({
      message: 'Pending leave requests per employee',
      data: summary,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get Upcoming Team Leaves Report
export const getUpcomingTeamLeaves = async (req: Request, res: Response): Promise<Response> => {
  try {
    const managerId = req.user?.userId;
    const role = req.user?.role;

    if (!managerId || role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can access upcoming team leaves' });
    }

    const managementRepo = AppDataSource.getRepository(UserManagement);
    const leaveRepo = AppDataSource.getRepository(LeaveRequest);

    const managedUsers = await managementRepo.find({
      where: { manager: { userId: managerId } },
      relations: ['user'],
    });

    const userIds = managedUsers.map(entry => entry.user.userId);

    if (!userIds.length) {
      return res.json({ message: 'No team members found', data: [] });
    }

    const today = new Date();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const upcomingLeaves = await leaveRepo.find({
      where: {
        user: { userId: In(userIds) },
        status: 'Approved',
        startDate: Between(today.toISOString(), thirtyDaysFromNow.toISOString()),
      },
      relations: ['user'],
    });

    const formatted = upcomingLeaves.map(leave => ({
      userId: leave.user.userId,
      name: `${leave.user.firstname} ${leave.user.surname}`,
      startDate: leave.startDate,
      endDate: leave.endDate,
    }));

    return res.json({
      message: 'Upcoming approved leaves within 30 days',
      data: formatted,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};