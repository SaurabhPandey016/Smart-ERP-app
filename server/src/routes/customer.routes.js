import { Router } from 'express';
import { customerController } from '../controllers/customer.controller.js';

const router = Router({ mergeParams: true });
router.get('/', customerController.list);
router.get('/:id/statement', customerController.getStatement);

export default router;
