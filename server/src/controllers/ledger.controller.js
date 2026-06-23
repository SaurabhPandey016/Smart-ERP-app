import { ledgerService } from '../services/ledger.service.js';
import { exportService } from '../services/export.service.js';

export const ledgerController = {
  async list(req, res) {
    const ledgers = await ledgerService.list(req.companyId, req.query.type);
    res.json({ success: true, data: ledgers });
  },
  async getById(req, res) {
    const ledger = await ledgerService.getById(req.companyId, req.params.id);
    res.json({ success: true, data: ledger });
  },
  async create(req, res) {
    const ledger = await ledgerService.create(req.companyId, req.body);
    res.status(201).json({ success: true, data: ledger });
  },
  async update(req, res) {
    const ledger = await ledgerService.update(req.companyId, req.params.id, req.body);
    res.json({ success: true, data: ledger });
  },
  async delete(req, res) {
    await ledgerService.delete(req.companyId, req.params.id);
    res.json({ success: true, message: 'Ledger deleted' });
  },
  async getStatement(req, res) {
    const data = await ledgerService.getStatement(req.companyId, req.params.id);
    res.json({ success: true, data });
  },
  async exportExcel(req, res) {
    const ledgers = await ledgerService.list(req.companyId, req.query.type);
    await exportService.exportLedgers(ledgers, res);
  },
};
