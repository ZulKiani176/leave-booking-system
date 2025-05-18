
import { AppDataSource } from '../src/ormconfig';

export default async function globalTeardown() {
  const ds = await AppDataSource.initialize();

  // Disable FK 
  await ds.query(`SET FOREIGN_KEY_CHECKS = 0;`);

  //  DELETE TEST DATA: OUT- prefix
  await ds.query(`
    DELETE lr
      FROM leave_request lr
      JOIN user u ON lr.userId = u.userId
    WHERE u.email LIKE 'out-%@example.com';
  `);

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

  await ds.query(`
    DELETE FROM user
    WHERE email LIKE 'out-%@example.com';
  `);

  // DELETE TEST DATA: test174 prefix 
  await ds.query(`
    DELETE lr
      FROM leave_request lr
      JOIN user u ON lr.userId = u.userId
    WHERE u.email LIKE 'test174%@example.com';
  `);

  await ds.query(`
    DELETE um
      FROM user_management um
      JOIN user u ON um.userId = u.userId
    WHERE u.email LIKE 'test174%@example.com';
  `);

  await ds.query(`
    DELETE um
      FROM user_management um
      JOIN user m ON um.managerId = m.userId
    WHERE m.email LIKE 'test174%@example.com';
  `);

  await ds.query(`
    DELETE FROM user
    WHERE email LIKE 'test174%@example.com';
  `);

  // Re-enable FK 
  await ds.query(`SET FOREIGN_KEY_CHECKS = 1;`);
  await ds.destroy();
}
