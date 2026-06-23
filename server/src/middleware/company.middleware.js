import prisma from '../config/db.js';
import { AppError } from './error.middleware.js';

// Verifies companyId param belongs to the authenticated user
export const companyContext = async (req, res, next) => {
  const { companyId } = req.params;

  if (!companyId) {
    throw new AppError('Company ID is required', 400, 'COMPANY_ID_MISSING');
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: req.userId },
    select: { id: true },
  });

  if (!company) {
    throw new AppError('Company not found or access denied', 403, 'COMPANY_ACCESS_DENIED');
  }

  req.companyId = companyId;
  next();
};
