import { Router } from 'express';
import {
  getCollaborations,
  getCollaborationById,
  createCollaboration,
  updateCollaboration,
  deleteCollaboration,
} from '../controllers/collaborationController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getCollaborations);
router.get('/:id', getCollaborationById);
router.post('/', createCollaboration);
router.put('/:id', updateCollaboration);
router.delete('/:id', authorize('ADMIN', 'IP MANAGER'), deleteCollaboration);

export default router;
