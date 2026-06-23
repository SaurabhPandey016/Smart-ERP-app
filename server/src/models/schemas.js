import { z } from 'zod';

// Auth
export const RegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Company
export const CompanySchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
  financialYear: z.string().default('2024-25'),
  state: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
});

// Ledger
export const LedgerSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['CUSTOMER', 'SUPPLIER', 'EXPENSE', 'INCOME', 'BANK', 'CASH']),
  openingBalance: z.number().default(0),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
});

// Unit
export const UnitSchema = z.object({
  name: z.string().min(1).max(50),
  symbol: z.string().min(1).max(20),
});

// Stock Item
export const StockItemSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().optional(),
  purchasePrice: z.number().min(0).default(0),
  sellingPrice: z.number().min(0).default(0),
  currentStock: z.number().default(0),
  gstPercent: z.number().min(0).max(100).default(0),
  unitId: z.string().optional(),
});

// Voucher
export const VoucherItemSchema = z.object({
  stockItemId: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().positive(),
  rate: z.number().min(0),
  gstPercent: z.number().min(0).max(100).default(0),
});

export const VoucherSchema = z.object({
  type: z.enum(['SALES', 'PURCHASE', 'RECEIPT', 'PAYMENT', 'CONTRA', 'CREDIT_NOTE', 'DEBIT_NOTE']),
  date: z.string(),
  partyLedgerId: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(VoucherItemSchema).min(1),
});

// Inventory Adjustment
export const InventoryAdjustmentSchema = z.object({
  stockItemId: z.string(),
  type: z.enum(['STOCK_IN', 'STOCK_OUT', 'TRANSFER', 'ADJUSTMENT', 'DAMAGED']),
  quantity: z.number().positive(),
  notes: z.string().optional(),
});
