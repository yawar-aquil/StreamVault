import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// JWT secret - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'streamvault-auth-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

// Salt rounds for bcrypt
const SALT_ROUNDS = 10;

// Password hashing
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

// JWT Token generation
export interface TokenPayload {
    userId: string;
    email: string;
    username: string;
}

export function generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch {
        return null;
    }
}

// Express middleware types
export interface AuthRequest extends Request {
    user?: TokenPayload;
}

// Auth middleware - extracts user from token
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
    // Get token from cookie or authorization header
    const token = req.cookies?.authToken || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return next(); // No token, continue without user
    }

    const payload = verifyToken(token);
    if (payload) {
        req.user = payload;
    }

    next();
}

// Require auth middleware - returns 401 if not authenticated
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
    const token = req.cookies?.authToken || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const payload = verifyToken(token);
    if (!payload) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = payload;
    next();
}

// Set auth cookie
export function setAuthCookie(res: Response, token: string) {
    res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
}

// Clear auth cookie
export function clearAuthCookie(res: Response) {
    res.clearCookie('authToken');
}
