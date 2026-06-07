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
  'https://deep3d.org',
  'https://www.deep3d.org',
  'https://f9render.com',
  'https://www.f9render.com',
  'http://f9render.com',
  'http://www.f9render.com',
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

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = '/home/thinhvu1/f9render.com';
  app.use(express.static(frontendPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Error handler (must be last)
app.use(errorHandler);

export default app;
