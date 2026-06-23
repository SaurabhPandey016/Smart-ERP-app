import prisma from '../config/db.js';

export const customerController = {
  async list(req, res) {
    const customers = await prisma.ledger.findMany({
      where: { companyId: req.companyId, type: 'CUSTOMER' },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: customers });
  },
  async getStatement(req, res) {
    const ledger = await prisma.ledger.findFirst({ where: { id: req.params.id, companyId: req.companyId, type: 'CUSTOMER' } });
    const vouchers = await prisma.voucher.findMany({
      where: { companyId: req.companyId, partyLedgerId: req.params.id },
      include: { items: { include: { stockItem: { select: { name: true } } } } },
      orderBy: { date: 'desc' },
    });
    res.json({ success: true, data: { ledger, vouchers } });
  },
};
