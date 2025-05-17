import 'reflect-metadata';
import { AppDataSource } from '../ormconfig';
import { Role } from '../entities/role';
import { User } from '../entities/user';
import { UserManagement } from '../entities/user-management';
import crypto from 'crypto';
import { hashPassword } from '../utils/hash';

const seedRoles = async () => {
  await AppDataSource.initialize();

  const roleRepo = AppDataSource.getRepository(Role);
  const userRepo = AppDataSource.getRepository(User);
  const userManagementRepo = AppDataSource.getRepository(UserManagement);

  // 1. Seed roles
  const rolesToInsert = [
    { roleId: 1, name: 'employee' },
    { roleId: 2, name: 'manager' },
    { roleId: 3, name: 'admin' },
  ];

  for (const role of rolesToInsert) {
    const exists = await roleRepo.findOne({ where: { roleId: role.roleId } });
    if (!exists) {
      await roleRepo.insert(role);
      console.log(`Inserted role: ${role.name}`);
    } else {
      console.log(`Role '${role.name}' already exists. Skipping.`);
    }
  }

  // 2. ✅ Auto-create admin user
  const adminExists = await userRepo.findOne({ where: { email: 'admin@example.com' } });
  if (!adminExists) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hashed = hashPassword('admin123', salt);
    const adminRole = await roleRepo.findOne({ where: { name: 'admin' } });

    const admin = userRepo.create({
      firstname: 'System',
      surname: 'Admin',
      email: 'admin@example.com',
      department: 'IT',
      salt,
      password: hashed,
      role: adminRole!,
    });

    await userRepo.save(admin);
    console.log('✅ Admin user created: admin@example.com / admin123');
  } else {
    console.log('ℹ️ Admin user already exists. Skipping.');
  }

  // 2b. ✅ Add test manager + employee
  const unitManagerEmail = 'unit-manager@example.com';
  const unitEmployeeEmail = 'unit-employee@example.com';

  const existingUnitManager = await userRepo.findOne({ where: { email: unitManagerEmail } });
  const existingUnitEmployee = await userRepo.findOne({ where: { email: unitEmployeeEmail } });

  if (!existingUnitManager) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hashed = hashPassword('secure123', salt);
    const managerRole = await roleRepo.findOne({ where: { name: 'manager' } });

    const manager = userRepo.create({
      firstname: 'Unit',
      surname: 'Manager',
      email: unitManagerEmail,
      department: 'Test',
      salt,
      password: hashed,
      role: managerRole!,
    });

    await userRepo.save(manager);
    console.log(`✅ Test manager created: ${unitManagerEmail} / secure123`);
  } else {
    console.log(`ℹ️ Test manager '${unitManagerEmail}' already exists. Skipping.`);
  }

  if (!existingUnitEmployee) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hashed = hashPassword('secure123', salt);
    const employeeRole = await roleRepo.findOne({ where: { name: 'employee' } });

    const employee = userRepo.create({
      firstname: 'Unit',
      surname: 'Employee',
      email: unitEmployeeEmail,
      department: 'Test',
      salt,
      password: hashed,
      role: employeeRole!,
      annualLeaveBalance: 10,
    });

    await userRepo.save(employee);
    console.log(`✅ Test employee created: ${unitEmployeeEmail} / secure123`);
  } else {
    console.log(`ℹ️ Test employee '${unitEmployeeEmail}' already exists. Skipping.`);
  }

  // 3. Seed user management mapping
  const employee = await userRepo.findOne({ where: { email: unitEmployeeEmail } });
  const manager = await userRepo.findOne({ where: { email: unitManagerEmail } });

  if (employee && manager) {
    const exists = await userManagementRepo.findOne({
      where: { user: { userId: employee.userId } },
    });

    if (!exists) {
      const link = new UserManagement();
      link.user = employee;
      link.manager = manager;
      link.startDate = new Date('2024-01-01');

      await userManagementRepo.save(link);
      console.log(`Linked ${employee.email} to manager ${manager.email}`);
    } else {
      console.log('UserManagement mapping already exists. Skipping.');
    }
  } else {
    console.log('Manager or employee user not found. Mapping skipped.');
  }

  // ✅ NEW: Add 'unit-other' employee
  const otherExists = await userRepo.findOne({ where: { email: 'unit-other@example.com' } });
  if (!otherExists) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hashed = hashPassword('secure123', salt);
    const employeeRole = await roleRepo.findOne({ where: { name: 'employee' } });

    const other = userRepo.create({
      firstname: 'Unit',
      surname: 'Other',
      email: 'unit-other@example.com',
      department: 'Test',
      salt,
      password: hashed,
      role: employeeRole!,
      annualLeaveBalance: 10,
    });

    await userRepo.save(other);
    console.log(`✅ Test secondary employee created: unit-other@example.com / secure123`);
  } else {
    console.log('ℹ️ Test secondary employee already exists. Skipping.');
  }

  // ✅ NEW: Add 'unit-admin'
  const unitAdminExists = await userRepo.findOne({ where: { email: 'unit-admin@example.com' } });
  if (!unitAdminExists) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hashed = hashPassword('secure123', salt);
    const adminRole = await roleRepo.findOne({ where: { name: 'admin' } });

    const unitAdmin = userRepo.create({
      firstname: 'Unit',
      surname: 'Admin',
      email: 'unit-admin@example.com',
      department: 'Test',
      salt,
      password: hashed,
      role: adminRole!,
    });

    await userRepo.save(unitAdmin);
    console.log(`✅ Test admin created: unit-admin@example.com / secure123`);
  } else {
    console.log('ℹ️ Test admin already exists. Skipping.');
  }

  await AppDataSource.destroy();
};

seedRoles().catch((err) => {
  console.error('Seeding failed:', err);
});
