import 'dotenv/config';
import bcrypt from 'bcrypt';
import { db } from '../src/config/db.js';
import { users } from '../src/db/schema.js';

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@arqademy.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';

  const hashedPassword = await bcrypt.hash(password, 10);

  const [admin] = await db
    .insert(users)
    .values({
      email,
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'admin',
      arqId: 'ARQADMIN01',
      verified: true,
      active: true,
    })
    .returning();

  console.log('Admin created:', admin.email, admin.id);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});