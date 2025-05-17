import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/ormconfig';
import { User } from '../../src/entities/user';
import { LeaveRequest } from '../../src/entities/leave-request';
import jwt from 'jsonwebtoken';

let employeeToken: string;
let otherToken: string;
let employeeId: number;

beforeAll(async () => {
  await AppDataSource.initialize();

  const userRepo = AppDataSource.getRepository(User);
  const unitEmployee = await userRepo.findOneByOrFail({ email: 'unit-employee@example.com' });
  const unitOther = await userRepo.findOneByOrFail({ email: 'unit-other@example.com' });

  employeeId = unitEmployee.userId;

  employeeToken = jwt.sign(
    { userId: unitEmployee.userId, role: 'employee' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );

  otherToken = jwt.sign(
    { userId: unitOther.userId, role: 'employee' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  await AppDataSource.destroy();
});

describe('cancelLeave()', () => {
  it('should cancel a pending leave request successfully', async () => {
    const leaveRepo = AppDataSource.getRepository(LeaveRequest);
    const leave = leaveRepo.create({
      leaveType: 'Annual Leave',
      startDate: '2025-12-01',
      endDate: '2025-12-02',
      status: 'Pending',
      user: { userId: employeeId },
    });
    const saved = await leaveRepo.save(leave);

    const res = await request(app)
      .delete('/api/leave-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ leaveRequestId: saved.leaveRequestId });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/cancelled/i);
  });

  it('should allow cancelling an approved leave request', async () => {
    const leaveRepo = AppDataSource.getRepository(LeaveRequest);
    const leave = leaveRepo.create({
      leaveType: 'Annual Leave',
      startDate: '2025-12-10',
      endDate: '2025-12-11',
      status: 'Approved',
      user: { userId: employeeId },
    });
    const saved = await leaveRepo.save(leave);

    const res = await request(app)
      .delete('/api/leave-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ leaveRequestId: saved.leaveRequestId });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/cancelled/i);
  });

  it("should not allow cancelling someone else's request", async () => {
    const leaveRepo = AppDataSource.getRepository(LeaveRequest);
    const leave = leaveRepo.create({
      leaveType: 'Annual Leave',
      startDate: '2025-12-20',
      endDate: '2025-12-21',
      status: 'Pending',
      user: { userId: employeeId },
    });
    const saved = await leaveRepo.save(leave);

    const res = await request(app)
      .delete('/api/leave-requests')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ leaveRequestId: saved.leaveRequestId });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/unauthorised to cancel/i);
  });
});
