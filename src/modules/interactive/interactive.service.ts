import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { interactiveElements } from '../../db/schema.js';

export class InteractiveService {
  create(resourceId: string, data: any) {
    return db.insert(interactiveElements).values({ ...data, resourceId }).returning().then((r) => r[0]);
  }
  listByResource(resourceId: string) {
    return db.select().from(interactiveElements).where(eq(interactiveElements.resourceId, resourceId));
  }
  getById(id: string) {
    return db.select().from(interactiveElements).where(eq(interactiveElements.id, id)).limit(1).then((r) => r[0] || null);
  }
  update(id: string, data: any) {
    return db.update(interactiveElements).set(data).where(eq(interactiveElements.id, id)).returning().then((r) => r[0] || null);
  }
  delete(id: string) {
    return db.delete(interactiveElements).where(eq(interactiveElements.id, id)).returning().then((r) => r[0] || null);
  }
}