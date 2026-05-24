import { Router } from 'express';
import * as controller from './issues.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', controller.listIssues);
router.get('/:id', controller.getIssueById);
router.post('/', authenticate, controller.createIssue);
router.patch('/:id', authenticate, controller.updateIssue);
router.delete('/:id', authenticate, controller.deleteIssue);

export default router;
