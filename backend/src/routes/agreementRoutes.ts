import { Router } from 'express';
import {
  getAgreements,
  getAgreementById,
  createAgreement,
  updateAgreement,
  deleteAgreement,
} from '../controllers/agreementController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getAgreements);
router.get('/:id', getAgreementById);
router.post('/', authorize('ADMIN', 'IP MANAGER'), createAgreement);
router.put('/:id', authorize('ADMIN', 'IP MANAGER'), updateAgreement);
router.delete('/:id', authorize('ADMIN', 'IP MANAGER'), deleteAgreement);

export default router;
