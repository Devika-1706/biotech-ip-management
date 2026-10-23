import { Router } from 'express';
import {
  getDisclosures,
  getDisclosureById,
  createDisclosure,
  updateDisclosure,
  convertToPatent,
  deleteDisclosure,
} from '../controllers/disclosureController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getDisclosures);
router.get('/:id', getDisclosureById);
router.post('/', createDisclosure); // All roles can submit a disclosure
router.put('/:id', updateDisclosure);
router.post('/:id/convert-to-patent', authorize('ADMIN', 'IP MANAGER'), convertToPatent);
router.delete('/:id', authorize('ADMIN', 'IP MANAGER'), deleteDisclosure);

export default router;
