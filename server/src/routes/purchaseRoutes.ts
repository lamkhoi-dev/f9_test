import { Router } from 'express';
import { purchasePersonalKey } from '../controllers/promptController';

const router = Router();

router.post('/personal-key', purchasePersonalKey);

export default router;
