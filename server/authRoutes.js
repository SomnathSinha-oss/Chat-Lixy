import express from 'express';
import jwt from 'jsonwebtoken';
import {
    createSSRClient,
    getCookieOptions,
    clearAuthCookies,
    authenticateSSR,
    JWT_SECRET
} from './supabaseServer.js';

const router = express.Router();

// In-memory user store for standalone / fallback demo mode
const mockUsers = new Map([
    [
        '11111111-1111-4111-a111-111111111111',
        {
            id: '11111111-1111-4111-a111-111111111111',
            email: 'alex@chatlixy.local',
            password: 'Password123!',
            display_name: 'Alex Vance',
            phone_number: '+1 (555) 019-2831',
            status: 'online',
            avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            public_key: null
        }
    ],
    [
        '22222222-2222-4222-a222-222222222222',
        {
            id: '22222222-2222-4222-a222-222222222222',
            email: 'lexi@chatlixy.local',
            password: 'Password123!',
            display_name: 'Lexi Nova',
            phone_number: '+1 (555) 014-9823',
            status: 'online',
            avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
            public_key: null
        }
    ],
    [
        '33333333-3333-4333-a333-333333333333',
        {
            id: '33333333-3333-4333-a333-333333333333',
            email: 'elena@chatlixy.local',
            password: 'Password123!',
            display_name: 'Elena Rostova',
            phone_number: '+1 (555) 017-4420',
            status: 'online',
            avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
            public_key: null
        }
    ],
    [
        '44444444-4444-4444-a444-444444444444',
        {
            id: '44444444-4444-4444-a444-444444444444',
            email: 'marcus@chatlixy.local',
            password: 'Password123!',
            display_name: 'Marcus Chen',
            phone_number: '+1 (555) 012-7744',
            status: 'offline',
            avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
            public_key: null
        }
    ],
    [
        '55555555-5555-4555-a555-555555555555',
        {
            id: '55555555-5555-4555-a555-555555555555',
            email: 'sophia@chatlixy.local',
            password: 'Password123!',
            display_name: 'Dr. Sophia Al-Mansoor',
            phone_number: '+1 (555) 018-3391',
            status: 'online',
            avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
            public_key: null
        }
    ],
    [
        '66666666-6666-4666-a666-666666666666',
        {
            id: '66666666-6666-4666-a666-666666666666',
            email: 'kai@chatlixy.local',
            password: 'Password123!',
            display_name: 'Kai Sterling',
            phone_number: '+1 (555) 016-5512',
            status: 'away',
            avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
            public_key: null
        }
    ]
]);

/**
 * POST /api/auth/signup
 * Registers user, provisions Supabase Auth session or mock user,
 * and sets HttpOnly, Secure, SameSite=Strict cookies.
 */
router.post('/signup', async (req, res) => {
    try {
        const { email, password, display_name } = req.body;

        if (!email || !password || !display_name) {
            return res.status(400).json({ error: 'Email, password, and display name are required.' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
        }

        // Live Supabase integration if configured
        if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_URL !== 'https://demo-project.supabase.co') {
            const supabase = createSSRClient(req, res);
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { display_name }
                }
            });

            if (error) {
                return res.status(400).json({ error: error.message });
            }

            if (data.session) {
                // Set HttpOnly, Secure, SameSite=Strict cookies
                res.cookie('sb-access-token', data.session.access_token, getCookieOptions(req, 900));
                res.cookie('sb-refresh-token', data.session.refresh_token, getCookieOptions(req, 60 * 60 * 24 * 7));
            }

            return res.status(201).json({
                message: 'Signup successful.',
                user: {
                    id: data.user?.id,
                    email: data.user?.email,
                    display_name
                }
            });
        }

        // Standalone fallback
        const existing = Array.from(mockUsers.values()).find((u) => u.email === email);
        if (existing) {
            return res.status(400).json({ error: 'A user with this email already exists.' });
        }

        const newId = crypto.randomUUID();
        const newUser = {
            id: newId,
            email,
            password,
            display_name,
            status: 'online',
            avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(display_name)}`,
            public_key: null
        };
        mockUsers.set(newId, newUser);

        const accessToken = jwt.sign(
            { id: newUser.id, email: newUser.email, display_name: newUser.display_name },
            JWT_SECRET,
            { expiresIn: '15m' }
        );
        const refreshToken = jwt.sign(
            { id: newUser.id, email: newUser.email, display_name: newUser.display_name, type: 'refresh' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('sb-access-token', accessToken, getCookieOptions(req, 900));
        res.cookie('sb-refresh-token', refreshToken, getCookieOptions(req, 60 * 60 * 24 * 7));

        return res.status(201).json({
            message: 'Signup successful.',
            user: {
                id: newUser.id,
                email: newUser.email,
                display_name: newUser.display_name,
                avatar_url: newUser.avatar_url
            }
        });
    } catch (err) {
        console.error('Signup error:', err);
        return res.status(500).json({ error: 'Registration failed.' });
    }
});

/**
 * POST /api/auth/login
 * Validates credentials, issues short-lived JWT, and sets
 * HttpOnly, Secure, SameSite=Strict cookies.
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        // Live Supabase Auth
        if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_URL !== 'https://demo-project.supabase.co') {
            const supabase = createSSRClient(req, res);
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error || !data.session) {
                return res.status(401).json({ error: error?.message || 'Invalid credentials' });
            }

            res.cookie('sb-access-token', data.session.access_token, getCookieOptions(req, 900));
            res.cookie('sb-refresh-token', data.session.refresh_token, getCookieOptions(req, 60 * 60 * 24 * 7));

            return res.status(200).json({
                message: 'Login successful.',
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    display_name: data.user.user_metadata?.display_name || data.user.email
                }
            });
        }

        // Standalone fallback
        const user = Array.from(mockUsers.values()).find(
            (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
        );

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const accessToken = jwt.sign(
            { id: user.id, email: user.email, display_name: user.display_name },
            JWT_SECRET,
            { expiresIn: '15m' }
        );
        const refreshToken = jwt.sign(
            { id: user.id, email: user.email, display_name: user.display_name, type: 'refresh' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('sb-access-token', accessToken, getCookieOptions(req, 900));
        res.cookie('sb-refresh-token', refreshToken, getCookieOptions(req, 60 * 60 * 24 * 7));

        return res.status(200).json({
            message: 'Login successful.',
            user: {
                id: user.id,
                email: user.email,
                display_name: user.display_name,
                avatar_url: user.avatar_url
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Login authentication failed.' });
    }
});

/**
 * POST /api/auth/refresh
 * Explicit token rotation endpoint. Rotates refresh token and issues new short-lived JWT.
 */
router.post('/refresh', async (req, res) => {
    try {
        const refreshToken = req.cookies['sb-refresh-token'];
        if (!refreshToken) {
            clearAuthCookies(res, req);
            return res.status(401).json({ error: 'No refresh token provided.' });
        }

        if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_URL !== 'https://demo-project.supabase.co') {
            const supabase = createSSRClient(req, res);
            const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

            if (error || !data.session) {
                clearAuthCookies(res, req);
                return res.status(401).json({ error: 'Refresh token invalid or expired.' });
            }

            res.cookie('sb-access-token', data.session.access_token, getCookieOptions(req, 900));
            res.cookie('sb-refresh-token', data.session.refresh_token, getCookieOptions(req, 60 * 60 * 24 * 7));

            return res.json({ message: 'Token rotated successfully.' });
        }

        // Standalone rotation
        try {
            const decoded = jwt.verify(refreshToken, JWT_SECRET);
            if (decoded.type !== 'refresh') throw new Error('Invalid token type');

            const newAccessToken = jwt.sign(
                { id: decoded.id, email: decoded.email, display_name: decoded.display_name },
                JWT_SECRET,
                { expiresIn: '15m' }
            );
            const newRefreshToken = jwt.sign(
                { id: decoded.id, email: decoded.email, display_name: decoded.display_name, type: 'refresh' },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.cookie('sb-access-token', newAccessToken, getCookieOptions(req, 900));
            res.cookie('sb-refresh-token', newRefreshToken, getCookieOptions(req, 60 * 60 * 24 * 7));

            return res.json({ message: 'Token rotated successfully.' });
        } catch (_jwtErr) {
            clearAuthCookies(res, req);
            return res.status(401).json({ error: 'Refresh token expired or invalid.' });
        }
    } catch (err) {
        console.error('Refresh error:', err);
        return res.status(500).json({ error: 'Token refresh failed.' });
    }
});

/**
 * GET /api/auth/session
 * Returns authenticated user session using SSR cookies.
 */
router.get('/session', authenticateSSR, async (req, res) => {
    try {
        const user = req.user;
        let profile = null;

        if (mockUsers.has(user.id)) {
            const mock = mockUsers.get(user.id);
            profile = {
                id: mock.id,
                email: mock.email,
                display_name: mock.display_name,
                phone_number: mock.phone_number,
                avatar_url: mock.avatar_url,
                public_key: mock.public_key,
                status: mock.status
            };
        } else {
            profile = {
                id: user.id,
                email: user.email,
                display_name: user.user_metadata?.display_name || user.display_name || user.email,
                phone_number: user.user_metadata?.phone_number || '+1 (555) 019-0000',
                avatar_url: user.user_metadata?.avatar_url || null,
                public_key: user.user_metadata?.public_key || null,
                status: 'online'
            };
        }

        return res.json({
            authenticated: true,
            user: profile
        });
    } catch (_err) {
        return res.status(500).json({ error: 'Failed to retrieve session.' });
    }
});

/**
 * POST /api/auth/logout
 * Revokes session and zeroes out HttpOnly cookies.
 */
router.post('/logout', (req, res) => {
    try {
        clearAuthCookies(res, req);
        return res.status(200).json({ message: 'Logged out successfully.' });
    } catch (_err) {
        return res.status(500).json({ error: 'Logout failed.' });
    }
});

/**
 * GET /api/auth/users
 * Returns directory of contacts for starting conversations.
 */
router.get('/users', authenticateSSR, (_req, res) => {
    const list = Array.from(mockUsers.values()).map((u) => ({
        id: u.id,
        email: u.email,
        display_name: u.display_name,
        phone_number: u.phone_number,
        avatar_url: u.avatar_url,
        status: u.status,
        public_key: u.public_key
    }));
    return res.json({ users: list });
});

/**
 * POST /api/auth/public-key
 * Updates user's Web Crypto public key for E2EE key agreement.
 */
router.post('/public-key', authenticateSSR, (req, res) => {
    const { public_key } = req.body;
    if (!public_key) {
        return res.status(400).json({ error: 'public_key is required.' });
    }

    if (mockUsers.has(req.user.id)) {
        mockUsers.get(req.user.id).public_key = public_key;
    }

    return res.json({ success: true, message: 'Public key updated.' });
});

export default router;
