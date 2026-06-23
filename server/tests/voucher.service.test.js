import { describe, it, expect, vi, afterEach } from 'vitest';
import { voucherService } from '../src/services/voucher.service.js';
import { AppError } from '../src/middleware/error.middleware.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('voucherService.update guards', () => {
  it('throws when voucher is cancelled', async () => {
    vi.spyOn(voucherService, 'getById').mockResolvedValue({ id: 'v1', status: 'CANCELLED', type: 'SALES', items: [], partyLedgerId: null, netAmount: 0 });
    await expect(voucherService.update('c1', 'v1', {})).rejects.toThrow();
  });

  it('throws when changing voucher type', async () => {
    vi.spyOn(voucherService, 'getById').mockResolvedValue({ id: 'v2', status: 'POSTED', type: 'SALES', items: [], partyLedgerId: null, netAmount: 0 });
    await expect(voucherService.update('c1', 'v2', { type: 'PURCHASE' })).rejects.toThrow();
  });
});
