import { Router } from 'express';
import { companyController } from '../controllers/company.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { CompanySchema } from '../models/schemas.js';

const router = Router();
router.get('/', companyController.list);
router.post('/', validate(CompanySchema), companyController.create);
router.get('/:id', companyController.getById);
router.put('/:id', validate(CompanySchema.partial()), companyController.update);
router.delete('/:id', companyController.delete);

export default router;
