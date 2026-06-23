import prisma from '../config/db.js';
import { AppError } from '../middleware/error.middleware.js';

export const companyController = {
  async list(req, res) {
    const companies = await prisma.company.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: companies });
  },

  async create(req, res) {
    const count = await prisma.company.count({ where: { userId: req.userId } });
    if (count >= 5) throw new AppError('Maximum 5 companies allowed per account', 403, 'MAX_COMPANIES');

    const company = await prisma.company.create({
      data: { userId: req.userId, ...req.body },
    });

    // Seed default units
    await prisma.unit.createMany({
      data: [
        { companyId: company.id, name: 'Pieces', symbol: 'PCS' },
        { companyId: company.id, name: 'Kilogram', symbol: 'KG' },
        { companyId: company.id, name: 'Box', symbol: 'BOX' },
        { companyId: company.id, name: 'Litre', symbol: 'LTR' },
        { companyId: company.id, name: 'Metre', symbol: 'MTR' },
      ],
    });

    res.status(201).json({ success: true, data: company });
  },

  async getById(req, res) {
    const company = await prisma.company.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!company) throw new AppError('Company not found', 404, 'NOT_FOUND');
    res.json({ success: true, data: company });
  },

  async update(req, res) {
    const company = await prisma.company.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!company) throw new AppError('Company not found', 404, 'NOT_FOUND');
    const updated = await prisma.company.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: updated });
  },

  async delete(req, res) {
    const company = await prisma.company.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!company) throw new AppError('Company not found', 404, 'NOT_FOUND');
    await prisma.company.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Company deleted successfully' });
  },
};
