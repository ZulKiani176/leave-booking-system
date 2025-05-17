import express from 'express';
import dotenv from 'dotenv';
import leaveRequestRoutes from './routes/leave-request.routes';
import { apiLimiter } from './middleware/rateLimiter';

dotenv.config();

const app = express();
app.disable('x-powered-by');
app.use(express.json());
app.use(apiLimiter);

// Inject mock user directly into request (used only for tests)
app.use((req, res, next) => {
  const testAuth = req.headers['x-test-user'];
  if (testAuth) {
    const parsed = JSON.parse(testAuth as string);
    req.user = parsed;
  }
  next();
});

app.use('/api/leave-requests', leaveRequestRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;
