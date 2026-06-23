import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export function getErrorMessage(error) {
  return error?.response?.data?.error || error?.message || 'Something went wrong';
}

export const LEDGER_TYPES = [
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'SUPPLIER', label: 'Supplier' },
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'INCOME', label: 'Income' },
  { value: 'BANK', label: 'Bank' },
  { value: 'CASH', label: 'Cash' },
];

export const VOUCHER_TYPES = [
  { value: 'SALES', label: 'Sales', shortcut: 'F8' },
  { value: 'PURCHASE', label: 'Purchase', shortcut: 'F9' },
  { value: 'RECEIPT', label: 'Receipt', shortcut: 'F6' },
  { value: 'PAYMENT', label: 'Payment', shortcut: 'F7' },
  { value: 'CONTRA', label: 'Contra', shortcut: 'F4' },
  { value: 'CREDIT_NOTE', label: 'Credit Note', shortcut: 'Alt+F8' },
  { value: 'DEBIT_NOTE', label: 'Debit Note', shortcut: 'Alt+F9' },
];

export const GST_RATES = [0, 5, 12, 18, 28];

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry',
];
