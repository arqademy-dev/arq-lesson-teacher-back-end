import { Router } from 'express';
import { CurriculumController } from './curriculum.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import {
  createSubjectSchema, updateSubjectSchema,
  createClassSchema, updateClassSchema,
  createTopicSchema, updateTopicSchema,
  createResourceSchema, updateResourceSchema,
} from './curriculum.validation.js';

const router = Router();
const controller = new CurriculumController();

// 🔒 FORCE AUTHENTICATION FOR EVERYONE (Admin & Educator must be logged in)
router.use(authenticate);

// --- 📚 SUBJECTS ---
// Admins manage, Educators can view
router.post('/subjects', requireRole('admin'), validateBody(createSubjectSchema), controller.createSubject);
router.get('/subjects', requireRole('admin', 'educator'), controller.listSubjects);
router.get('/subjects/:id', requireRole('admin', 'educator'), controller.getSubject);
router.patch('/subjects/:id', requireRole('admin'), validateBody(updateSubjectSchema), controller.updateSubject);
router.delete('/subjects/:id', requireRole('admin'), controller.deleteSubject);

// --- 🏫 CLASSES ---
// Admins manage, Educators can view
router.post('/subjects/:subjectId/classes', requireRole('admin'), validateBody(createClassSchema), controller.createClass);
router.get('/subjects/:subjectId/classes', requireRole('admin', 'educator'), controller.listClasses);
router.get('/classes/:id', requireRole('admin', 'educator'), controller.getClass);
router.patch('/classes/:id', requireRole('admin'), validateBody(updateClassSchema), controller.updateClass);
router.delete('/classes/:id', requireRole('admin'), controller.deleteClass);

// --- 📝 TOPICS ---
// Admins manage, Educators can view
router.post('/classes/:classId/topics', requireRole('admin'), validateBody(createTopicSchema), controller.createTopic);
router.get('/classes/:classId/topics', requireRole('admin', 'educator'), controller.listTopics);
router.get('/topics/:id', requireRole('admin', 'educator'), controller.getTopic);
router.patch('/topics/:id', requireRole('admin'), validateBody(updateTopicSchema), controller.updateTopic);
router.delete('/topics/:id', requireRole('admin'), controller.deleteTopic);

// --- 📂 RESOURCES ---
// BOTH Admin and Educator can fully manage resources
router.post('/topics/:topicId/resources', requireRole('admin', 'educator'), validateBody(createResourceSchema), controller.createResource);
router.get('/topics/:topicId/resources', requireRole('admin', 'educator'), controller.listResources);
router.get('/resources/:id', requireRole('admin', 'educator'), controller.getResource);
router.patch('/resources/:id', requireRole('admin', 'educator'), validateBody(updateResourceSchema), controller.updateResource);
router.delete('/resources/:id', requireRole('admin', 'educator'), controller.deleteResource);

export { router as curriculumRoutes };
