import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import WebSocket from 'ws';

if (!globalThis.WebSocket) {
    globalThis.WebSocket = WebSocket;
}

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://demo-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'demo-anon-key';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'chatlixy-super-secret-jwt-signing-key-32chars!';

// Administrative Supabase client for server-side operations
export const supabaseAdmin = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

/**
 * Configure secure cookie parameters matching the security mandate:
 * - HttpOnly: Inaccessible to client JavaScript (prevents XSS exfiltration)
 * - Secure: Sent only over HTTPS in production
 * - SameSite: Strict (prevents session hijacking and CSRF)
 */
export const getCookieOptions = (req, maxAgeSeconds = 900) => {
    const isProd = process.env.NODE_ENV === 'production';
    const isHttps = Boolean(
        req?.secure ||
        req?.headers?.['x-forwarded-proto'] === 'https'
    );

    return {
        httpOnly: true,
        secure: isProd ? true : isHttps,
        sameSite: 'strict',
        path: '/',
        maxAge: maxAgeSeconds * 1000 // Convert seconds to ms
    };
};

/**
 * Creates an SSR Supabase client scoped to the incoming request & response.
 * Uses `@supabase/ssr` with HttpOnly, Secure, SameSite=Strict cookies.
 */
export function createSSRClient(req, res) {
    return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        cookies: {
            getAll() {
                return Object.keys(req.cookies || {}).map((name) => ({
                    name,
                    value: req.cookies[name]
                }));
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                    const mergedOptions = {
                        ...getCookieOptions(req, options?.maxAge || 900),
                        ...options,
                        httpOnly: true,
                        sameSite: 'strict'
                    };
                    res.cookie(name, value, mergedOptions);
                });
            }
        }
    });
}

/**
 * Server-Side Session Verification & Automatic Refresh Token Rotation (RTR)
 */
export async function authenticateSSR(req, res, next) {
    const accessToken = req.cookies['sb-access-token'];
    const refreshToken = req.cookies['sb-refresh-token'];

    if (!accessToken && !refreshToken) {
        return res.status(401).json({
            error: 'Authentication required. No session cookies provided.'
        });
    }

    try {
        // If live Supabase URL is available, verify via Supabase Auth
        if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
            const supabase = createSSRClient(req, res);
            const { data: { user }, error } = await supabase.auth.getUser(accessToken);

            if (!error && user) {
                req.user = user;
                return next();
            }

            // Access token expired or invalid; attempt automatic Refresh Token Rotation (RTR)
            if (refreshToken) {
                const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
                    refresh_token: refreshToken
                });

                if (refreshError || !refreshData.session) {
                    // Refresh token invalid or revoked; clear cookies
                    clearAuthCookies(res, req);
                    return res.status(401).json({ error: 'Session expired. Please log in again.' });
                }

                // Set newly rotated tokens in HttpOnly Secure cookies
                const newSession = refreshData.session;
                res.cookie('sb-access-token', newSession.access_token, getCookieOptions(req, 900)); // 15 mins
                res.cookie('sb-refresh-token', newSession.refresh_token, getCookieOptions(req, 60 * 60 * 24 * 7)); // 7 days

                req.user = newSession.user;
                return next();
            }
        }

        // Local / Standalone development fallback with signed JWT verification
        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, JWT_SECRET);
                req.user = decoded;
                return next();
            } catch (jwtErr) {
                // If token expired, verify refresh token for local rotation
                if (jwtErr.name === 'TokenExpiredError' && refreshToken) {
                    try {
                        const refreshDecoded = jwt.verify(refreshToken, JWT_SECRET);
                        if (refreshDecoded.type !== 'refresh') {
                            throw new Error('Invalid token type', { cause: jwtErr });
                        }

                        // Rotate tokens
                        const newAccessToken = jwt.sign(
                            { id: refreshDecoded.id, email: refreshDecoded.email, display_name: refreshDecoded.display_name },
                            JWT_SECRET,
                            { expiresIn: '15m' }
                        );
                        const newRefreshToken = jwt.sign(
                            { id: refreshDecoded.id, email: refreshDecoded.email, display_name: refreshDecoded.display_name, type: 'refresh' },
                            JWT_SECRET,
                            { expiresIn: '7d' }
                        );

                        res.cookie('sb-access-token', newAccessToken, getCookieOptions(req, 900));
                        res.cookie('sb-refresh-token', newRefreshToken, getCookieOptions(req, 60 * 60 * 24 * 7));

                        req.user = refreshDecoded;
                        return next();
                    } catch (_rfErr) {
                        clearAuthCookies(res, req);
                        return res.status(401).json({ error: 'Refresh token expired or invalid.' });
                    }
                }
                clearAuthCookies(res, req);
                return res.status(401).json({ error: 'Invalid access token.' });
            }
        }

        return res.status(401).json({ error: 'Session validation failed.' });
    } catch (err) {
        console.error('SSR Auth Error:', err);
        return res.status(500).json({ error: 'Internal session authentication error.' });
    }
}

/**
 * Clear all authentication cookies with maxAge: 0
 */
export function clearAuthCookies(res, req) {
    const opts = {
        ...getCookieOptions(req, 0),
        maxAge: 0
    };
    res.cookie('sb-access-token', '', opts);
    res.cookie('sb-refresh-token', '', opts);
}

export { JWT_SECRET, SUPABASE_URL, SUPABASE_ANON_KEY };
