import { Router } from 'express';
import { purchasePersonalKey, deductInstantCredit } from '../controllers/promptController';

const router = Router();

router.post('/personal-key', purchasePersonalKey);
router.post('/deduct-instant', deductInstantCredit);

export default router;
