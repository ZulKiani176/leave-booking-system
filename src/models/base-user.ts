import { User } from '../entities/user';

export class BaseUserLogic {
  constructor(public user: User) {}

  getFullName(): string {
    return `${this.user.firstname} ${this.user.surname}`;
  }

  getPrivileges(): string {
    return 'Standard user';
  }
}

export class AdminUser extends BaseUserLogic {
  getPrivileges(): string {
    return 'Admin: full system access';
  }
}

export class ManagerUser extends BaseUserLogic {
  getPrivileges(): string {
    return 'Manager: team leave control';
  }
}
