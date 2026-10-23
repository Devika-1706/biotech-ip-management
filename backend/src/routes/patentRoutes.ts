import { Router } from 'express';
import {
  getPatents,
  getPatentById,
  createPatent,
  updatePatent,
  deletePatent,
} from '../controllers/patentController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getPatents);
router.get('/:id', getPatentById);
router.post('/', authorize('ADMIN', 'IP MANAGER'), createPatent);
router.put('/:id', authorize('ADMIN', 'IP MANAGER'), updatePatent);
router.delete('/:id', authorize('ADMIN', 'IP MANAGER'), deletePatent);

export default router;
