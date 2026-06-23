import prisma from '../config/db.js';
import { AppError } from '../middleware/error.middleware.js';

const PREFIX = {
  SALES: 'SL',
  PURCHASE: 'PUR',
  RECEIPT: 'RCT',
  PAYMENT: 'PMT',
  CONTRA: 'CNT',
  CREDIT_NOTE: 'CN',
  DEBIT_NOTE: 'DN',
};

async function generateVoucherNumber(companyId, type) {
  const count = await prisma.voucher.count({ where: { companyId, type } });
  const year = new Date().getFullYear();
  return `${PREFIX[type]}-${year}-${String(count + 1).padStart(4, '0')}`;
}

export const voucherService = {
  async list(companyId, type) {
    return prisma.voucher.findMany({
      where: { companyId, ...(type ? { type } : {}) },
      include: {
        partyLedger: { select: { name: true, type: true } },
        items: { include: { stockItem: { select: { name: true, sku: true } } } },
      },
      orderBy: { date: 'desc' },
    });
  },

  async getById(companyId, id) {
    const voucher = await prisma.voucher.findFirst({
      where: { id, companyId },
      include: {
        partyLedger: true,
        company: true,
        items: { include: { stockItem: { include: { unit: true } } } },
      },
    });
    if (!voucher) throw new AppError('Voucher not found', 404, 'NOT_FOUND');
    return voucher;
  },

  async create(companyId, data) {
    const voucherNumber = await generateVoucherNumber(companyId, data.type);

    let totalAmount = 0;
    let taxAmount = 0;

    const processedItems = data.items.map((item) => {
      const amount = item.quantity * item.rate;
      const gstAmount = (amount * item.gstPercent) / 100;
      totalAmount += amount;
      taxAmount += gstAmount;
      return {
        stockItemId: item.stockItemId || null,
        description: item.description || null,
        quantity: item.quantity,
        rate: item.rate,
        amount,
        gstPercent: item.gstPercent,
        gstAmount,
        totalAmount: amount + gstAmount,
      };
    });

    const netAmount = totalAmount + taxAmount;

    const voucher = await prisma.$transaction(async (tx) => {
      const created = await tx.voucher.create({
        data: {
          companyId,
          type: data.type,
          number: voucherNumber,
          date: new Date(data.date),
          partyLedgerId: data.partyLedgerId || null,
          totalAmount,
          taxAmount,
          netAmount,
          notes: data.notes || null,
          status: 'POSTED',
          items: { create: processedItems },
        },
        include: { items: { include: { stockItem: true } }, partyLedger: true },
      });

      // Auto inventory update for SALES and PURCHASE vouchers
      for (const item of created.items) {
        if (!item.stockItemId) continue;

        const stockItem = await tx.stockItem.findUnique({ where: { id: item.stockItemId } });
        if (!stockItem) continue;

        const qty = Number(item.quantity);
        let newStock = Number(stockItem.currentStock);

        if (data.type === 'SALES') {
          newStock -= qty;
          if (newStock < 0) throw new AppError(`Insufficient stock for: ${stockItem.name}. Available: ${stockItem.currentStock}`, 400, 'INSUFFICIENT_STOCK');
        } else if (data.type === 'PURCHASE') {
          newStock += qty;
        } else if (data.type === 'CREDIT_NOTE') {
          newStock += qty; // return to stock
        } else if (data.type === 'DEBIT_NOTE') {
          newStock -= qty; // return to supplier, reduce stock
          if (newStock < 0) throw new AppError(`Insufficient stock for: ${stockItem.name}`, 400, 'INSUFFICIENT_STOCK');
        } else {
          continue; // RECEIPT/PAYMENT/CONTRA — no inventory change
        }

        await tx.stockItem.update({
          where: { id: item.stockItemId },
          data: { currentStock: newStock },
        });

        const logType = ['SALES', 'DEBIT_NOTE'].includes(data.type) ? 'STOCK_OUT' : 'STOCK_IN';

        await tx.inventoryLog.create({
          data: {
            companyId,
            stockItemId: item.stockItemId,
            voucherId: created.id,
            type: logType,
            quantity: qty,
            balanceAfter: newStock,
            notes: `${data.type} voucher #${voucherNumber}`,
          },
        });
      }

      // Update party ledger balance
      if (data.partyLedgerId) {
        const isDebit = ['SALES', 'DEBIT_NOTE'].includes(data.type);
        await tx.ledger.update({
          where: { id: data.partyLedgerId },
          data: { balance: { increment: isDebit ? netAmount : -netAmount } },
        });
      }

      return created;
    });

    return voucher;
  },

  async cancel(companyId, id) {
    const voucher = await this.getById(companyId, id);
    if (voucher.status === 'CANCELLED') throw new AppError('Voucher already cancelled', 400, 'ALREADY_CANCELLED');
    return prisma.voucher.update({ where: { id }, data: { status: 'CANCELLED' } });
  },
  async update(companyId, id, data) {
    const existing = await this.getById(companyId, id);
    if (existing.status === 'CANCELLED') throw new AppError('Cannot edit a cancelled voucher', 400, 'CANCELLED');
    if (existing.type !== data.type) throw new AppError('Cannot change voucher type on edit', 400, 'TYPE_CHANGE_NOT_ALLOWED');

    // prepare new items
    let totalAmount = 0;
    let taxAmount = 0;
    const processedItems = (data.items || []).map((item) => {
      const amount = item.quantity * item.rate;
      const gstAmount = (amount * item.gstPercent) / 100;
      totalAmount += amount;
      taxAmount += gstAmount;
      return {
        stockItemId: item.stockItemId || null,
        description: item.description || null,
        quantity: item.quantity,
        rate: item.rate,
        amount,
        gstPercent: item.gstPercent,
        gstAmount,
        totalAmount: amount + gstAmount,
      };
    });

    const netAmount = totalAmount + taxAmount;

    const updated = await prisma.$transaction(async (tx) => {
      // 1) Revert previous inventory and ledger effects
      for (const item of existing.items) {
        if (!item.stockItemId) continue;
        const stockItem = await tx.stockItem.findUnique({ where: { id: item.stockItemId } });
        if (!stockItem) continue;
        const qty = Number(item.quantity);
        let newStock = Number(stockItem.currentStock);

        if (existing.type === 'SALES' || existing.type === 'DEBIT_NOTE') {
          // previously reduced stock -> add back
          newStock += qty;
        } else if (existing.type === 'PURCHASE' || existing.type === 'CREDIT_NOTE') {
          // previously increased stock -> remove
          newStock -= qty;
          if (newStock < 0) throw new AppError(`Cannot revert stock for: ${stockItem.name}`, 400, 'REVERT_FAILED');
        } else {
          continue;
        }

        await tx.stockItem.update({ where: { id: item.stockItemId }, data: { currentStock: newStock } });

        // remove associated inventory logs for this voucher
        await tx.inventoryLog.deleteMany({ where: { voucherId: existing.id, stockItemId: item.stockItemId } });
      }

      // revert ledger balance
      if (existing.partyLedgerId) {
        const isDebit = ['SALES', 'DEBIT_NOTE'].includes(existing.type);
        // inverse the original increment
        await tx.ledger.update({ where: { id: existing.partyLedgerId }, data: { balance: { increment: isDebit ? -existing.netAmount : existing.netAmount } } });
      }

      // 2) Update voucher fields and replace items
      const upd = await tx.voucher.update({
        where: { id: existing.id },
        data: {
          date: new Date(data.date),
          partyLedgerId: data.partyLedgerId || null,
          totalAmount,
          taxAmount,
          netAmount,
          notes: data.notes || null,
          items: { deleteMany: {}, create: processedItems },
        },
        include: { items: true, partyLedger: true },
      });

      // 3) Apply new inventory and ledger effects (same logic as create)
      for (const item of upd.items) {
        if (!item.stockItemId) continue;
        const stockItem = await tx.stockItem.findUnique({ where: { id: item.stockItemId } });
        if (!stockItem) continue;
        const qty = Number(item.quantity);
        let newStock = Number(stockItem.currentStock);

        if (existing.type === 'SALES') {
          newStock -= qty;
          if (newStock < 0) throw new AppError(`Insufficient stock for: ${stockItem.name}. Available: ${stockItem.currentStock}`, 400, 'INSUFFICIENT_STOCK');
        } else if (existing.type === 'PURCHASE') {
          newStock += qty;
        } else if (existing.type === 'CREDIT_NOTE') {
          newStock += qty;
        } else if (existing.type === 'DEBIT_NOTE') {
          newStock -= qty;
          if (newStock < 0) throw new AppError(`Insufficient stock for: ${stockItem.name}`, 400, 'INSUFFICIENT_STOCK');
        } else {
          continue;
        }

        await tx.stockItem.update({ where: { id: item.stockItemId }, data: { currentStock: newStock } });

        const logType = ['SALES', 'DEBIT_NOTE'].includes(existing.type) ? 'STOCK_OUT' : 'STOCK_IN';

        await tx.inventoryLog.create({
          data: {
            companyId,
            stockItemId: item.stockItemId,
            voucherId: upd.id,
            type: logType,
            quantity: qty,
            balanceAfter: newStock,
            notes: `${existing.type} voucher #${upd.number}`,
          },
        });
      }

      // update ledger balance for new party ledger
      if (data.partyLedgerId) {
        const isDebit = ['SALES', 'DEBIT_NOTE'].includes(existing.type);
        await tx.ledger.update({ where: { id: data.partyLedgerId }, data: { balance: { increment: isDebit ? netAmount : -netAmount } } });
      }

      return upd;
    });

    return updated;
  },
};
