import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import leaveRequestRoutes from './routes/leave-request.routes';
import adminRoutes from './routes/admin.routes';
import { apiLimiter } from './middleware/rateLimiter'; 

dotenv.config();

const app = express();

app.disable('x-powered-by'); 
app.use(express.json());
app.use(apiLimiter); 

// Auth endpoints
app.use('/api/auth', authRoutes);

// Admin endpoints
app.use('/api/admin', adminRoutes);

// Leave request endpoints (employee, manager, admin)
app.use('/api/leave-requests', leaveRequestRoutes);


app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;
