import { Router } from 'express';
import { 
  uploadDocument, listDocuments, getDocument, 
  analyzeDocument, deleteDocument 
} from '../controllers/documentController.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadPdf } from '../middleware/upload.js';

const router = Router();

router.use(requireAuth);

router.post('/', uploadPdf.single('file'), uploadDocument);
router.get('/', listDocuments);
router.get('/:id', getDocument);
router.post('/:id/analyze', analyzeDocument);
router.delete('/:id', deleteDocument);

export default router;
