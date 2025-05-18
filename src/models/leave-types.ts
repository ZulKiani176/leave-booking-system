export abstract class LeaveType {
  abstract name: string;
  abstract getPolicyNote(): string;
}

export class AnnualLeave extends LeaveType {
  name = 'Annual Leave';

  getPolicyNote(): string {
    return 'Standard paid annual leave.';
  }
}

export class SickLeave extends LeaveType {
  name = 'Sick Leave';

  getPolicyNote(): string {
    return 'Medical certificate required.';
  }
}
