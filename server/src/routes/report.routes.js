import { Router } from 'express';
import { reportController } from '../controllers/report.controller.js';

const router = Router({ mergeParams: true });
router.get('/trial-balance', reportController.trialBalance);
router.get('/stock-summary', reportController.stockSummary);
router.get('/sales', reportController.salesSummary);
router.get('/purchases', reportController.purchaseSummary);

export default router;
