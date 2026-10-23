import { Router } from 'express';
import { getReportsData } from '../controllers/reportController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/statistics', getReportsData);

export default router;
