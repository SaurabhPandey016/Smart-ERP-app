import { Router } from 'express';
import { supplierController } from '../controllers/supplier.controller.js';

const router = Router({ mergeParams: true });
router.get('/', supplierController.list);
router.get('/:id/statement', supplierController.getStatement);

export default router;
