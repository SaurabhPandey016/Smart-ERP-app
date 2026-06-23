import { Router } from 'express';
import { voucherController } from '../controllers/voucher.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { VoucherSchema } from '../models/schemas.js';

const router = Router({ mergeParams: true });
router.get('/', voucherController.list);
router.post('/', validate(VoucherSchema), voucherController.create);
router.put('/:id', validate(VoucherSchema), voucherController.update);
router.get('/export', voucherController.exportExcel);
router.get('/:id', voucherController.getById);
router.get('/:id/pdf', voucherController.downloadPDF);
router.patch('/:id/cancel', voucherController.cancel);

export default router;
