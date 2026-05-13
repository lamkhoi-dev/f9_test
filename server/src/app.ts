import express from 'express';
import cors from 'cors';
import path from 'path';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

// CORS: allow multiple origins for production
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://f9-rendering.vercel.app',
  process.env.CORS_ORIGIN,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, some local tools)
    if (!origin) return callback(null, true);
    
    // Check if origin matches allowed list or common patterns
    const isAllowed = allowedOrigins.some(o => origin === o) || 
                      allowedOrigins.includes('*') ||
                      origin.endsWith('.vercel.app') ||
                      origin.endsWith('.railway.app');

    if (isAllowed) {
      return callback(null, true);
    }
    
    console.error(`[CORS] Blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-credentials'],
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for uploaded thumbnails
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api', routes);

// Error handler (must be last)
app.use(errorHandler);

export default app;
