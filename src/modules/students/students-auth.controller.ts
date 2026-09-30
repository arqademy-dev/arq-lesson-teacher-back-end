// ------------------------------------------------------------------
// Your real students-auth.controller.ts with ONE change: me() now joins
// programmes to add programmeTitle onto studentProfile. login() and the
// imports are untouched except for adding `programmes` to the schema import.
// ------------------------------------------------------------------

import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq, and } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { users, students, programmes } from '../../db/schema.js'; // CHANGED — added programmes
import { getAuthCookieOptions } from '../../utils/cookie-options.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secure-dev-secret-key-change-me';

export class StudentAuthController {
  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.role, 'student')))
        .limit(1);

      if (!user) return res.status(401).json({ message: 'Invalid credentials' });

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) return res.status(401).json({ message: 'Invalid credentials' });

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

      res.cookie('token', token, getAuthCookieOptions());

      return res.status(200).json({ message: 'Login successful', user: { id: user.id, email: user.email, arqId: user.arqId } });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Internal authentication error' });
    }
  }

  async me(req: Request, res: Response) {
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const [profile] = await db.select().from(students).where(eq(students.userId, user.id)).limit(1);

    // NEW — look up the programme's title, if the student has one.
    let programmeTitle: string | null = null;
    if (profile?.programId) {
      const [prog] = await db
        .select({ title: programmes.title })
        .from(programmes)
        .where(eq(programmes.id, profile.programId))
        .limit(1);
      programmeTitle = prog?.title ?? null;
    }

    return res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      arqId: user.arqId,
      studentProfile: profile ? { ...profile, programmeTitle } : null, // CHANGED
    });
  }
}