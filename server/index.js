import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import {
    securityHeaders,
    corsOptions,
    authRateLimiter,
    apiRateLimiter
} from './securityMiddleware.js';
import authRoutes from './authRoutes.js';
import chatRoutes from './chatRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust reverse proxy for secure cookies behind reverse proxies (Nginx, Cloudflare, etc.)
app.set('trust proxy', 1);

// Security & Parsing Middlewares
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting
app.use('/api/auth', authRateLimiter);
app.use('/api', apiRateLimiter);

// API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        app: 'ChatLixy SSR Server',
        timestamp: new Date().toISOString(),
        supabase_connected: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
        security: {
            cookies: 'HttpOnly, Secure, SameSite=Strict',
            token_rotation: 'Enabled (Automatic RTR)',
            e2ee: 'Web Crypto AES-256-GCM + ECDH'
        }
    });
});

// Centralized error handler
app.use((err, req, res, _next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
        error: 'An unexpected internal server error occurred.',
        code: 'INTERNAL_ERROR'
    });
});

// Start listener if executed directly
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`[ChatLixy Backend] Running on http://localhost:${PORT}`);
        console.log(`[Security] HttpOnly, Secure, SameSite=Strict cookies active`);
        console.log(`[Realtime] Supabase Realtime synchronization ready`);
    });
}

export default app;
