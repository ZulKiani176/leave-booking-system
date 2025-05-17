import fs from 'fs';
import path from 'path';

const logPath = path.join(__dirname, '..', '..', 'logs');

// Ensure logs directory exists
if (!fs.existsSync(logPath)) {
  fs.mkdirSync(logPath);
}

export const logClientError = (
  status: number,
  message: string,
  endpoint: string,
  method: string = 'UNKNOWN',
  userId: number | string = 'unauthenticated'
): void => {
  const logMessage = `[${new Date().toISOString()}] STATUS ${status} | ${method} ${endpoint} | user: ${userId} | ${message}\n`;
  fs.appendFileSync(path.join(logPath, 'client-errors.log'), logMessage);
};
