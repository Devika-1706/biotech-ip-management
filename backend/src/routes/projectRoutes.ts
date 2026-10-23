import { Router } from 'express';
import {
  getProjects,
  getProjectById,
  getProjectOverview,
  getProjectPatents,
  getProjectDisclosures,
  getProjectAgreements,
  getProjectFilings,
  getProjectCompliance,
  getProjectCollaborations,
  getProjectDeadlines,
  getProjectDocuments,
  getProjectActivity,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/projectController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Project collections and details
router.get('/', getProjects);
router.post('/', authorize('ADMIN', 'IP MANAGER'), createProject);
router.get('/:id', getProjectById);
router.put('/:id', authorize('ADMIN', 'IP MANAGER'), updateProject);
router.delete('/:id', authorize('ADMIN', 'IP MANAGER'), deleteProject);

// Project-scoped workspace modules
router.get('/:id/overview', getProjectOverview);
router.get('/:id/patents', getProjectPatents);
router.get('/:id/disclosures', getProjectDisclosures);
router.get('/:id/agreements', getProjectAgreements);
router.get('/:id/filings', getProjectFilings);
router.get('/:id/compliance', getProjectCompliance);
router.get('/:id/collaborations', getProjectCollaborations);
router.get('/:id/deadlines', getProjectDeadlines);
router.get('/:id/documents', getProjectDocuments);
router.get('/:id/activity', getProjectActivity);

export default router;
