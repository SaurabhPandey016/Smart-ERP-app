import { Router } from 'express';
import { ledgerController } from '../controllers/ledger.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { LedgerSchema } from '../models/schemas.js';

const router = Router({ mergeParams: true });
router.get('/', ledgerController.list);
router.post('/', validate(LedgerSchema), ledgerController.create);
router.get('/export', ledgerController.exportExcel);
router.get('/:id', ledgerController.getById);
router.get('/:id/statement', ledgerController.getStatement);
router.put('/:id', validate(LedgerSchema.partial()), ledgerController.update);
router.delete('/:id', ledgerController.delete);

export default router;
