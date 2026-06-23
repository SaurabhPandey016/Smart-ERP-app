import prisma from '../config/db.js';
import { AppError } from '../middleware/error.middleware.js';

export const ledgerService = {
  async list(companyId, type) {
    return prisma.ledger.findMany({
      where: { companyId, ...(type ? { type } : {}) },
      orderBy: { name: 'asc' },
    });
  },

  async getById(companyId, id) {
    const ledger = await prisma.ledger.findFirst({ where: { id, companyId } });
    if (!ledger) throw new AppError('Ledger not found', 404, 'NOT_FOUND');
    return ledger;
  },

  async create(companyId, data) {
    return prisma.ledger.create({
      data: {
        companyId,
        name: data.name,
        type: data.type,
        openingBalance: data.openingBalance ?? 0,
        balance: data.openingBalance ?? 0,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        gstNumber: data.gstNumber || null,
      },
    });
  },

  async update(companyId, id, data) {
    await this.getById(companyId, id);
    return prisma.ledger.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.type && { type: data.type }),
        ...(data.openingBalance !== undefined && { openingBalance: data.openingBalance }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.address !== undefined && { address: data.address || null }),
        ...(data.gstNumber !== undefined && { gstNumber: data.gstNumber || null }),
      },
    });
  },

  async delete(companyId, id) {
    await this.getById(companyId, id);
    const usage = await prisma.voucher.count({ where: { companyId, partyLedgerId: id } });
    if (usage > 0) throw new AppError('Cannot delete ledger used in vouchers', 409, 'LEDGER_IN_USE');
    await prisma.ledger.delete({ where: { id } });
  },

  async getStatement(companyId, id) {
    const ledger = await this.getById(companyId, id);
    const vouchers = await prisma.voucher.findMany({
      where: { companyId, partyLedgerId: id, status: 'POSTED' },
      include: { items: { include: { stockItem: { select: { name: true } } } } },
      orderBy: { date: 'asc' },
    });
    return { ledger, vouchers };
  },
};
