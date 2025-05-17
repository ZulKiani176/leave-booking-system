// tests/global-teardown.ts
import { AppDataSource } from '../src/ormconfig';

export default async function globalTeardown() {
  const ds = await AppDataSource.initialize();

  // disable FK checks so we can delete in any order
  await ds.query(`SET FOREIGN_KEY_CHECKS = 0;`);

  // 1) delete any leave_request rows for “out-…” test users
  await ds.query(`
    DELETE lr
      FROM leave_request lr
      JOIN user u ON lr.userId = u.userId
    WHERE u.email LIKE 'out-%@example.com';
  `);

  // 2) delete any user_management rows for those same “out-…” users
  await ds.query(`
    DELETE um
      FROM user_management um
      JOIN user u ON um.userId = u.userId
    WHERE u.email LIKE 'out-%@example.com';
  `);
  await ds.query(`
    DELETE um
      FROM user_management um
      JOIN user m ON um.managerId = m.userId
    WHERE m.email LIKE 'out-%@example.com';
  `);

  // 3) finally delete the “out-…” users themselves
  await ds.query(`
    DELETE FROM user
    WHERE email LIKE 'out-%@example.com';
  `);

  // re-enable FK checks and shut down
  await ds.query(`SET FOREIGN_KEY_CHECKS = 1;`);
  await ds.destroy();
}
