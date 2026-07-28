import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../config/db.js';
import { users } from '../db/schema.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'super-secure-dev-secret-key-change-me';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication cookie is missing' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };

    const [user] = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Account not found or inactive' });
    }

    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Session expired or token corrupt' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
}