import { Router } from 'express';
import { getReport, updateClauseReview, exportReport } from '../controllers/reportController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/:id', getReport);
router.patch('/:id/clauses/:clauseId/review', updateClauseReview);
router.get('/:id/export', exportReport);

export default router;
