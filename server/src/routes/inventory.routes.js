import { Router } from 'express';
import { inventoryController } from '../controllers/inventory.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { InventoryAdjustmentSchema } from '../models/schemas.js';

const router = Router({ mergeParams: true });
router.get('/dashboard', inventoryController.dashboard);
router.get('/logs', inventoryController.getLogs);
router.post('/adjust', validate(InventoryAdjustmentSchema), inventoryController.adjust);

export default router;
