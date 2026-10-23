import { Router } from 'express';
import {
  getComplianceItems,
  getComplianceById,
  createComplianceItem,
  updateComplianceItem,
  deleteComplianceItem,
} from '../controllers/complianceController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getComplianceItems);
router.get('/:id', getComplianceById);
router.post('/', authorize('ADMIN', 'IP MANAGER'), createComplianceItem);
router.put('/:id', authorize('ADMIN', 'IP MANAGER'), updateComplianceItem);
router.delete('/:id', authorize('ADMIN', 'IP MANAGER'), deleteComplianceItem);

export default router;
