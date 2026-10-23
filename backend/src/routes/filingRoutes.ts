import { Router } from 'express';
import {
  getFilings,
  getFilingById,
  createFiling,
  updateFiling,
  deleteFiling,
} from '../controllers/filingController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getFilings);
router.get('/:id', getFilingById);
router.post('/', authorize('ADMIN', 'IP MANAGER'), createFiling);
router.put('/:id', authorize('ADMIN', 'IP MANAGER'), updateFiling);
router.delete('/:id', authorize('ADMIN', 'IP MANAGER'), deleteFiling);

export default router;
