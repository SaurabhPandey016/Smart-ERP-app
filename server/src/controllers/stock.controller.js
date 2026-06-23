import prisma from '../config/db.js';
import { AppError } from '../middleware/error.middleware.js';
import { exportService } from '../services/export.service.js';

export const stockController = {
  async listItems(req, res) {
    const items = await prisma.stockItem.findMany({
      where: { companyId: req.companyId },
      include: { unit: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: items });
  },

  async getItemById(req, res) {
    const item = await prisma.stockItem.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: { unit: true, inventoryLogs: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!item) throw new AppError('Stock item not found', 404, 'NOT_FOUND');
    res.json({ success: true, data: item });
  },

  async createItem(req, res) {
    const item = await prisma.stockItem.create({
      data: { companyId: req.companyId, ...req.body },
      include: { unit: true },
    });
    res.status(201).json({ success: true, data: item });
  },

  async updateItem(req, res) {
    const existing = await prisma.stockItem.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!existing) throw new AppError('Stock item not found', 404, 'NOT_FOUND');
    const item = await prisma.stockItem.update({ where: { id: req.params.id }, data: req.body, include: { unit: true } });
    res.json({ success: true, data: item });
  },

  async deleteItem(req, res) {
    const existing = await prisma.stockItem.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!existing) throw new AppError('Stock item not found', 404, 'NOT_FOUND');
    const usage = await prisma.voucherItem.count({ where: { stockItemId: req.params.id } });
    if (usage > 0) throw new AppError('Cannot delete item used in vouchers', 409, 'ITEM_IN_USE');
    await prisma.stockItem.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Stock item deleted' });
  },

  async listUnits(req, res) {
    const units = await prisma.unit.findMany({ where: { companyId: req.companyId }, orderBy: { name: 'asc' } });
    res.json({ success: true, data: units });
  },

  async createUnit(req, res) {
    const unit = await prisma.unit.create({ data: { companyId: req.companyId, ...req.body } });
    res.status(201).json({ success: true, data: unit });
  },

  async deleteUnit(req, res) {
    await prisma.unit.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Unit deleted' });
  },

  async exportExcel(req, res) {
    const items = await prisma.stockItem.findMany({ where: { companyId: req.companyId }, include: { unit: true } });
    await exportService.exportStockSummary(items, res);
  },
};
