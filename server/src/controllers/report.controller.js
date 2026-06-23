import prisma from '../config/db.js';

export const reportController = {
  async trialBalance(req, res) {
    const ledgers = await prisma.ledger.findMany({ where: { companyId: req.companyId }, orderBy: { type: 'asc' } });
    const grouped = ledgers.reduce((acc, l) => {
      if (!acc[l.type]) acc[l.type] = [];
      acc[l.type].push(l);
      return acc;
    }, {});
    res.json({ success: true, data: { ledgers, grouped } });
  },

  async stockSummary(req, res) {
    const items = await prisma.stockItem.findMany({ where: { companyId: req.companyId }, include: { unit: true }, orderBy: { name: 'asc' } });
    const summary = items.map((i) => ({
      ...i,
      stockValue: Number(i.currentStock) * Number(i.purchasePrice),
      availableStock: Number(i.currentStock) - Number(i.reservedStock) - Number(i.damagedStock),
    }));
    const totalValue = summary.reduce((s, i) => s + i.stockValue, 0);
    res.json({ success: true, data: { items: summary, totalValue } });
  },

  async salesSummary(req, res) {
    const { from, to } = req.query;
    const where = { companyId: req.companyId, type: 'SALES', status: 'POSTED' };
    if (from || to) { where.date = {}; if (from) where.date.gte = new Date(from); if (to) where.date.lte = new Date(to); }
    const vouchers = await prisma.voucher.findMany({ where, include: { partyLedger: { select: { name: true } } }, orderBy: { date: 'desc' } });
    const totalSales = vouchers.reduce((s, v) => s + Number(v.netAmount), 0);
    const totalGST = vouchers.reduce((s, v) => s + Number(v.taxAmount), 0);
    res.json({ success: true, data: { vouchers, totalSales, totalGST, count: vouchers.length } });
  },

  async purchaseSummary(req, res) {
    const { from, to } = req.query;
    const where = { companyId: req.companyId, type: 'PURCHASE', status: 'POSTED' };
    if (from || to) { where.date = {}; if (from) where.date.gte = new Date(from); if (to) where.date.lte = new Date(to); }
    const vouchers = await prisma.voucher.findMany({ where, include: { partyLedger: { select: { name: true } } }, orderBy: { date: 'desc' } });
    const totalPurchase = vouchers.reduce((s, v) => s + Number(v.netAmount), 0);
    res.json({ success: true, data: { vouchers, totalPurchase, count: vouchers.length } });
  },
};
