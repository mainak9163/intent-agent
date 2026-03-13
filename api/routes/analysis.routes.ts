import { Router } from 'express';
import { runAnalysisHandler } from '../controllers/analysis.controllers';

const router = Router();

router.post('/run', runAnalysisHandler);

export default router;
