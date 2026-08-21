import { eq, and } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { subjects, classes, topics, resources } from '../../db/schema.js';

export class CurriculumService {
  // --- Subjects ---
  createSubject(data: { title: string; description?: string }, adminId: string) {
    return db.insert(subjects).values({ ...data, createdByAdminId: adminId }).returning().then((r) => r[0]);
  }
  listSubjects() {
    return db.select().from(subjects);
  }
  getSubject(id: string) {
    return db.select().from(subjects).where(eq(subjects.id, id)).limit(1).then((r) => r[0] || null);
  }
  updateSubject(id: string, data: Partial<{ title: string; description: string }>) {
    return db.update(subjects).set(data).where(eq(subjects.id, id)).returning().then((r) => r[0] || null);
  }
  deleteSubject(id: string) {
    return db.delete(subjects).where(eq(subjects.id, id)).returning().then((r) => r[0] || null);
  }

  // --- Classes ---
  createClass(data: { title: string; term?: string; isActive?: boolean }) {
    return db.insert(classes).values(data).returning().then((r) => r[0]);
  }
  // listClassesBySubject(subjectId: string) {
  //   return db.select().from(classes).where(eq(classes.subjectId, subjectId));
  // }
  listClasses() {
    return db.select().from(classes);
  }
  getClass(id: string) {
    return db.select().from(classes).where(eq(classes.id, id)).limit(1).then((r) => r[0] || null);
  }
  updateClass(id: string, data: Partial<{ title: string; term: string; isActive: boolean }>) {
    return db.update(classes).set(data).where(eq(classes.id, id)).returning().then((r) => r[0] || null);
  }
  deleteClass(id: string) {
    return db.delete(classes).where(eq(classes.id, id)).returning().then((r) => r[0] || null);
  }

  // --- Topics ---
  createTopic(data: { subjectId: string; classId: string; title: string; description?: string; sortOrder: number; expectedDurationDays: number }) {
    return db.insert(topics).values(data).returning().then((r) => r[0]);
  }
  // listTopicsByClass(classId: string) {
  //   return db.select().from(topics).where(eq(topics.classId, classId));
  // }
  async listTopics(filters: { subjectId?: string; classId?: string }) {
    const conditions = [];
    if (filters.subjectId) conditions.push(eq(topics.subjectId, filters.subjectId));
    if (filters.classId) conditions.push(eq(topics.classId, filters.classId));

    if (conditions.length === 0) return db.select().from(topics);
    return db.select().from(topics).where(and(...conditions));
  }
  getTopic(id: string) {
    return db.select().from(topics).where(eq(topics.id, id)).limit(1).then((r) => r[0] || null);
  }
  updateTopic(id: string, data: Partial<{ title: string; description: string; sortOrder: number; expectedDurationDays: number }>) {
    return db.update(topics).set(data).where(eq(topics.id, id)).returning().then((r) => r[0] || null);
  }
  deleteTopic(id: string) {
    return db.delete(topics).where(eq(topics.id, id)).returning().then((r) => r[0] || null);
  }

  // --- Resources ---
  createResource(
    topicId: string,
    data: { title: string; resourceType: string; urlOrPath: string; dayNumber: number; sortOrder: number }
  ) {
    return db.insert(resources).values({ ...data, topicId } as any).returning().then((r) => r[0]);
  }
  listResourcesByTopic(topicId: string) {
    return db.select().from(resources).where(eq(resources.topicId, topicId));
  }
  getResource(id: string) {
    return db.select().from(resources).where(eq(resources.id, id)).limit(1).then((r) => r[0] || null);
  }
  updateResource(id: string, data: Partial<{ title: string; resourceType: string; urlOrPath: string; dayNumber: number; sortOrder: number }>) {
    return db.update(resources).set(data as any).where(eq(resources.id, id)).returning().then((r) => r[0] || null);
  }
  deleteResource(id: string) {
    return db.delete(resources).where(eq(resources.id, id)).returning().then((r) => r[0] || null);
  }
}