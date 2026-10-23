import { Router } from 'express';
import { getDeadlines } from '../controllers/deadlineController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getDeadlines);

export default router;
