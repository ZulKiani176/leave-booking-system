import { hashPassword, comparePassword } from '../../../src/utils/hash';
import crypto from 'crypto';

describe('Password hashing', () => {
  const password = 'testpass';

  it('should hash and verify a password correctly', () => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);
    const match = comparePassword(password, salt, hash);
    expect(match).toBe(true);
  });

  it('should fail verification if password is incorrect', () => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);
    const match = comparePassword('wrongpass', salt, hash);
    expect(match).toBe(false);
  });
});
