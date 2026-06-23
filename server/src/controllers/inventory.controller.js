import prisma from '../config/db.js';
import { AppError } from '../middleware/error.middleware.js';

export const inventoryController = {
  async dashboard(req, res) {
    const [items, recentLogs] = await Promise.all([
      prisma.stockItem.findMany({ where: { companyId: req.companyId }, include: { unit: true }, orderBy: { name: 'asc' } }),
      prisma.inventoryLog.findMany({
        where: { companyId: req.companyId },
        include: { stockItem: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);
    const summary = {
      totalItems: items.length,
      totalStockValue: items.reduce((s, i) => s + Number(i.currentStock) * Number(i.purchasePrice), 0),
      lowStockItems: items.filter((i) => Number(i.currentStock) > 0 && Number(i.currentStock) <= 5).length,
      outOfStock: items.filter((i) => Number(i.currentStock) <= 0).length,
    };
    res.json({ success: true, data: { items, recentLogs, summary } });
  },

  async getLogs(req, res) {
    const { stockItemId, type } = req.query;
    const logs = await prisma.inventoryLog.findMany({
      where: {
        companyId: req.companyId,
        ...(stockItemId ? { stockItemId } : {}),
        ...(type ? { type } : {}),
      },
      include: {
        stockItem: { select: { name: true, sku: true } },
        voucher: { select: { number: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: logs });
  },

  async adjust(req, res) {
    const { stockItemId, type, quantity, notes } = req.body;
    const item = await prisma.stockItem.findFirst({ where: { id: stockItemId, companyId: req.companyId } });
    if (!item) throw new AppError('Stock item not found', 404, 'NOT_FOUND');

    const qty = Number(quantity);
    let newStock = Number(item.currentStock);

    if (['STOCK_IN', 'TRANSFER'].includes(type)) {
      newStock += qty;
    } else if (['STOCK_OUT', 'DAMAGED'].includes(type)) {
      if (newStock < qty) throw new AppError('Insufficient stock', 400, 'INSUFFICIENT_STOCK');
      newStock -= qty;
    } else if (type === 'ADJUSTMENT') {
      newStock = qty;
    }

    await prisma.$transaction([
      prisma.stockItem.update({ where: { id: stockItemId }, data: { currentStock: newStock } }),
      prisma.inventoryLog.create({
        data: { companyId: req.companyId, stockItemId, type, quantity: qty, balanceAfter: newStock, notes: notes || null },
      }),
    ]);

    const updated = await prisma.stockItem.findUnique({ where: { id: stockItemId }, include: { unit: true } });
    res.json({ success: true, data: updated });
  },
};
