import prisma from '../config/db.js';

export const supplierController = {
  async list(req, res) {
    const suppliers = await prisma.ledger.findMany({
      where: { companyId: req.companyId, type: 'SUPPLIER' },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: suppliers });
  },
  async getStatement(req, res) {
    const ledger = await prisma.ledger.findFirst({ where: { id: req.params.id, companyId: req.companyId, type: 'SUPPLIER' } });
    const vouchers = await prisma.voucher.findMany({
      where: { companyId: req.companyId, partyLedgerId: req.params.id },
      include: { items: { include: { stockItem: { select: { name: true } } } } },
      orderBy: { date: 'desc' },
    });
    const purchaseHistory = vouchers.filter((v) => v.type === 'PURCHASE');
    const paymentHistory = vouchers.filter((v) => v.type === 'PAYMENT');
    res.json({ success: true, data: { ledger, purchaseHistory, paymentHistory, vouchers } });
  },
};
