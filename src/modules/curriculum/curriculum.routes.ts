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

// Every route here is admin-only
router.use(authenticate, requireRole('admin'));

router.post('/subjects', validateBody(createSubjectSchema), controller.createSubject);
router.get('/subjects', controller.listSubjects);
router.get('/subjects/:id', controller.getSubject);
router.patch('/subjects/:id', validateBody(updateSubjectSchema), controller.updateSubject);
router.delete('/subjects/:id', controller.deleteSubject);

router.post('/subjects/:subjectId/classes', validateBody(createClassSchema), controller.createClass);
router.get('/subjects/:subjectId/classes', controller.listClasses);
router.get('/classes/:id', controller.getClass);
router.patch('/classes/:id', validateBody(updateClassSchema), controller.updateClass);
router.delete('/classes/:id', controller.deleteClass);

router.post('/classes/:classId/topics', validateBody(createTopicSchema), controller.createTopic);
router.get('/classes/:classId/topics', controller.listTopics);
router.get('/topics/:id', controller.getTopic);
router.patch('/topics/:id', validateBody(updateTopicSchema), controller.updateTopic);
router.delete('/topics/:id', controller.deleteTopic);

router.post('/topics/:topicId/resources', validateBody(createResourceSchema), controller.createResource);
router.get('/topics/:topicId/resources', controller.listResources);
router.get('/resources/:id', controller.getResource);
router.patch('/resources/:id', validateBody(updateResourceSchema), controller.updateResource);
router.delete('/resources/:id', controller.deleteResource);

export { router as curriculumRoutes };