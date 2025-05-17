import crypto from 'crypto';

export const generateSalt = (): string =>
  crypto.randomBytes(16).toString('hex');

export const hashPassword = (password: string, salt: string): string =>
  crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');

export const comparePassword = (
  password: string,
  salt: string,
  hashed: string
): boolean => {
  const inputHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return inputHash === hashed;
};
