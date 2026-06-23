import { voucherService } from '../services/voucher.service.js';
import { invoiceService } from '../services/invoice.service.js';
import { exportService } from '../services/export.service.js';

export const voucherController = {
  async list(req, res) {
    const vouchers = await voucherService.list(req.companyId, req.query.type);
    res.json({ success: true, data: vouchers });
  },
  async getById(req, res) {
    const voucher = await voucherService.getById(req.companyId, req.params.id);
    res.json({ success: true, data: voucher });
  },
  async create(req, res) {
    const voucher = await voucherService.create(req.companyId, req.body);
    res.status(201).json({ success: true, data: voucher });
  },
  async update(req, res) {
    const voucher = await voucherService.update(req.companyId, req.params.id, req.body);
    res.json({ success: true, data: voucher });
  },
  async cancel(req, res) {
    const voucher = await voucherService.cancel(req.companyId, req.params.id);
    res.json({ success: true, data: voucher });
  },
  async downloadPDF(req, res) {
    const voucher = await voucherService.getById(req.companyId, req.params.id);
    invoiceService.generatePDF({ voucher, company: voucher.company }, res);
  },
  async exportExcel(req, res) {
    const vouchers = await voucherService.list(req.companyId, req.query.type);
    await exportService.exportVouchers(vouchers, req.query.type || 'ALL', res);
  },
};
