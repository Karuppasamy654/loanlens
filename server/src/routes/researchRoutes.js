import { Router } from 'express';
import { getResearchData } from '../controllers/researchController.js';

const router = Router();

// Publicly accessible for academic transparency and research page
router.get('/models', getResearchData);

export default router;
