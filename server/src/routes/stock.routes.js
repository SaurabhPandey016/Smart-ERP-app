import { Router } from 'express';
import { stockController } from '../controllers/stock.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { StockItemSchema, UnitSchema } from '../models/schemas.js';

const router = Router({ mergeParams: true });

// Stock Items
router.get('/items', stockController.listItems);
router.post('/items', validate(StockItemSchema), stockController.createItem);
router.get('/items/export', stockController.exportExcel);
router.get('/items/:id', stockController.getItemById);
router.put('/items/:id', validate(StockItemSchema.partial()), stockController.updateItem);
router.delete('/items/:id', stockController.deleteItem);

// Units
router.get('/units', stockController.listUnits);
router.post('/units', validate(UnitSchema), stockController.createUnit);
router.delete('/units/:id', stockController.deleteUnit);

export default router;
